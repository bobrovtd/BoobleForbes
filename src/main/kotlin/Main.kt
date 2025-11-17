import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.request.*
import io.ktor.server.response.*
import io.ktor.server.routing.*
import io.ktor.server.http.content.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

/**
 * Точка входа в приложение.
 *
 * Поднимает embedded Ktor-сервер на порту 8080 и настраивает модуль [module].
 */
fun main() {
    embeddedServer(
        Netty,
        port = 8080,
        host = "0.0.0.0",
        module = Application::module
    ).start(wait = true)
}

/**
 * Основной модуль Ktor-приложения.
 *
 * Здесь:
 * - настраиваются плагины (JSON, CORS, статика);
 * - регистрируются HTTP-маршруты API и фронтенда;
 * - выполняется начальное заполнение репозитория форм.
 */
fun Application.module() {
    // JSON-сериализация/десериализация для REST API
    install(ContentNegotiation) {
        json(
            Json {
                prettyPrint = true
                isLenient = true
                ignoreUnknownKeys = true
            }
        )
    }

    // Разрешаем запросы с фронта (в учебных целях достаточно минимальной настройки)
    install(CORS) {
        anyHost()
        allowHeader(HttpHeaders.ContentType)
    }

    // Статические файлы фронтенда (HTML/CSS/JS) из resources/static
    installStaticResources()

    // Seed-данные для демонстрационной формы
    FormRepository.seedDemo()

    // REST-маршруты
    configureRouting()
}

/**
 * Подключает раздачу статических файлов из каталога `resources/static`.
 *
 * Ожидается, что там лежит фронтенд приложения (index.html, js, css).
 */
private fun Application.installStaticResources() {
    routing {
        staticResources(
            remotePath = "/",
            basePackage = "static"
        ) {
            default("index.html")
        }
    }
}

/**
 * Конфигурирует REST-маршруты API для работы с формами и ответами.
 *
 * Эндпоинты:
 * - `GET  /api/forms`                 — список всех форм
 * - `GET  /api/forms/{id}`            — получить форму по id
 * - `POST /api/forms`                 — создать форму
 * - `PUT  /api/forms/{id}`            — обновить форму
 * - `DELETE /api/forms/{id}`          — удалить форму
 * - `POST /api/forms/{id}/responses`  — отправить ответы респондента
 * - `GET  /api/forms/{id}/responses`  — получить ответы респондентов
 */
fun Application.configureRouting() {
    routing {

        route("/api/forms") {

            /**
             * `GET /api/forms`
             *
             * Возвращает список всех форм.
             */
            get {
                val forms = FormRepository.getAll()
                call.respond(forms)
            }

            /**
             * `GET /api/forms/{id}`
             *
             * @return 200 + [Form] если найдена, 404 если формы нет, 400 при некорректном id.
             */
            get("{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Invalid id")
                    return@get
                }

                val form = FormRepository.get(id)
                if (form == null) {
                    call.respond(HttpStatusCode.NotFound, "Form not found")
                } else {
                    call.respond(form)
                }
            }

            /**
             * `POST /api/forms`
             *
             * Создаёт новую форму.
             *
             * @body [FormUpsertRequest]
             * @return 201 + созданная [Form].
             */
            post {
                val req = call.receive<FormUpsertRequest>()
                val created = FormRepository.create(req)
                call.respond(HttpStatusCode.Created, created)
            }

            /**
             * `PUT /api/forms/{id}`
             *
             * Обновляет существующую форму.
             *
             * @body [FormUpsertRequest]
             * @return 200 + обновлённая [Form] или 404 если формы нет.
             */
            put("{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Invalid id")
                    return@put
                }

                val req = call.receive<FormUpsertRequest>()
                val updated = FormRepository.update(id, req)
                if (updated == null) {
                    call.respond(HttpStatusCode.NotFound, "Form not found")
                } else {
                    call.respond(updated)
                }
            }

            /**
             * `DELETE /api/forms/{id}`
             *
             * Удаляет форму и все её ответы.
             *
             * @return 204 если удалено, 404 если форма не найдена.
             */
            delete("{id}") {
                val id = call.parameters["id"]?.toLongOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Invalid id")
                    return@delete
                }

                val removed = FormRepository.delete(id)
                if (!removed) {
                    call.respond(HttpStatusCode.NotFound, "Form not found")
                } else {
                    call.respond(HttpStatusCode.NoContent)
                }
            }

            /**
             * `POST /api/forms/{id}/responses`
             *
             * Добавляет ответ респондента к форме.
             *
             * @body [SubmitResponseRequest]
             * @return 201 + [FormResponse], 404 если форма не найдена.
             */
            post("{id}/responses") {
                val id = call.parameters["id"]?.toLongOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Invalid id")
                    return@post
                }

                val req = call.receive<SubmitResponseRequest>()
                val saved = FormRepository.addResponse(id, req)
                if (saved == null) {
                    call.respond(HttpStatusCode.NotFound, "Form not found")
                } else {
                    call.respond(HttpStatusCode.Created, saved)
                }
            }

            /**
             * `GET /api/forms/{id}/responses`
             *
             * Возвращает все ответы для указанной формы.
             *
             * @return 200 + список [FormResponse] либо 404 если формы нет.
             */
            get("{id}/responses") {
                val id = call.parameters["id"]?.toLongOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Invalid id")
                    return@get
                }

                val form = FormRepository.get(id)
                if (form == null) {
                    call.respond(HttpStatusCode.NotFound, "Form not found")
                    return@get
                }

                val responses = FormRepository.getResponses(id).orEmpty()
                call.respond(responses)
            }
        }
    }
}

/* =========================== Доменные модели =========================== */

/**
 * Модель формы (аналог Google Forms).
 *
 * @property id Уникальный идентификатор формы.
 * @property title Заголовок формы.
 * @property description Описание формы.
 * @property questions Список вопросов формы.
 */
@Serializable
data class Form(
    val id: Long? = null,
    val title: String,
    val description: String = "",
    val questions: List<Question> = emptyList()
)

/**
 * Вопрос внутри формы.
 *
 * Типы вопросов:
 * - `"text"`     — однострочный текст;
 * - `"textarea"` — многострочный текст;
 * - `"radio"`    — одиночный выбор;
 * - `"checkbox"` — множественный выбор (в текущем прототипе ответы хранятся строкой).
 *
 * @property id Уникальный идентификатор вопроса внутри формы.
 * @property type Тип вопроса.
 * @property question Текст вопроса.
 * @property required Обязателен ли вопрос для заполнения.
 * @property options Список вариантов ответа (для radio/checkbox).
 */
@Serializable
data class Question(
    val id: Long? = null,
    val type: String,
    val question: String,
    val required: Boolean = false,
    val options: List<String> = emptyList()
)

/**
 * Ответ респондента на форму.
 *
 * @property id Уникальный идентификатор ответа.
 * @property timestamp Момент отправки ответа в миллисекундах (Unix time).
 * @property answers Карта "id вопроса → значение ответа" в виде строки.
 */
@Serializable
data class FormResponse(
    val id: Long,
    val timestamp: Long,
    val answers: Map<String, String>
)

/**
 * DTO для создания или обновления формы через REST API.
 *
 * @property title Заголовок формы.
 * @property description Описание формы.
 * @property questions Список вопросов формы.
 */
@Serializable
data class FormUpsertRequest(
    val title: String,
    val description: String = "",
    val questions: List<Question>
)

/**
 * DTO для отправки заполненной формы.
 *
 * @property answers Карта "id вопроса → ответ". Ключи передаются как строки.
 */
@Serializable
data class SubmitResponseRequest(
    val answers: Map<String, String>
)

/* ======================== In-memory репозиторий ======================== */

/**
 * Простейшее in-memory хранилище форм и ответов.
 *
 * Используется только в учебном прототипе. В реальном приложении вместо него
 * будет использоваться БД (PostgreSQL, MySQL и т.п.).
 */
object FormRepository {

    /** Хранилище форм по их ID. */
    private val forms = ConcurrentHashMap<Long, Form>()

    /** Хранилище ответов: `id формы → список ответов`. */
    private val formResponses = ConcurrentHashMap<Long, MutableList<FormResponse>>()

    /** Счётчик для генерации ID форм. */
    private val formIdSeq = AtomicLong(1)

    /** Счётчик для генерации ID ответов. */
    private val responseIdSeq = AtomicLong(1)

    /**
     * Возвращает список всех форм.
     *
     * @return все сохранённые формы.
     */
    fun getAll(): List<Form> =
        forms.values.sortedBy { it.id }

    /**
     * Возвращает форму по её идентификатору.
     *
     * @param id ID формы.
     * @return форму или `null`, если форма не найдена.
     */
    fun get(id: Long): Form? = forms[id]

    /**
     * Создаёт новую форму.
     *
     * - Присваивает новый ID форме.
     * - Пронумеровывает вопросы начиная с 1 (в рамках формы).
     *
     * @param req данные формы.
     * @return созданная форма.
     */
    fun create(req: FormUpsertRequest): Form {
        val id = formIdSeq.getAndIncrement()
        val questionsWithIds = req.questions.mapIndexed { index, q ->
            q.copy(id = (index + 1).toLong())
        }
        val form = Form(
            id = id,
            title = req.title,
            description = req.description,
            questions = questionsWithIds
        )
        forms[id] = form
        return form
    }

    /**
     * Обновляет существующую форму.
     *
     * Если форма с таким ID не найдена, возвращает `null`.
     * Вопросы переупорядочиваются и получают ID:
     * - если у вопроса указан id, он сохраняется;
     * - иначе назначается последовательный ID (1, 2, 3, ...).
     *
     * @param id идентификатор формы.
     * @param req новые данные формы.
     * @return обновлённая форма или `null`, если форма не существует.
     */
    fun update(id: Long, req: FormUpsertRequest): Form? {
        if (!forms.containsKey(id)) return null

        val questionsWithIds = req.questions.mapIndexed { index, q ->
            q.copy(id = q.id ?: (index + 1).toLong())
        }

        val updated = Form(
            id = id,
            title = req.title,
            description = req.description,
            questions = questionsWithIds
        )
        forms[id] = updated
        return updated
    }

    /**
     * Удаляет форму и все её ответы.
     *
     * @param id идентификатор формы.
     * @return `true`, если форма была удалена, иначе `false`.
     */
    fun delete(id: Long): Boolean {
        val removed = forms.remove(id)
        formResponses.remove(id)
        return removed != null
    }

    /**
     * Добавляет ответ респондента к форме.
     *
     * @param formId ID формы.
     * @param req данные ответа.
     * @return созданный [FormResponse] или `null`, если форма не найдена.
     */
    fun addResponse(formId: Long, req: SubmitResponseRequest): FormResponse? {
        if (!forms.containsKey(formId)) return null

        val id = responseIdSeq.getAndIncrement()
        val response = FormResponse(
            id = id,
            timestamp = Instant.now().toEpochMilli(),
            answers = req.answers
        )

        formResponses.computeIfAbsent(formId) { mutableListOf() }.add(response)
        return response
    }

    /**
     * Возвращает все ответы по форме.
     *
     * @param formId ID формы.
     * @return список ответов или `null`, если для формы ещё нет ответов.
     */
    fun getResponses(formId: Long): List<FormResponse>? =
        formResponses[formId]?.toList()

    /**
     * Заполняет репозиторий демонстрационной формой, если он ещё пустой.
     *
     * Используется для удобства разработки и демонстрации прототипа.
     */
    fun seedDemo() {
        if (forms.isNotEmpty()) return

        create(
            FormUpsertRequest(
                title = "Опрос по качеству сервиса",
                description = "Помогите нам улучшить качество обслуживания",
                questions = listOf(
                    Question(
                        id = 1,
                        type = "text",
                        question = "Как вас зовут?",
                        required = true
                    ),
                    Question(
                        id = 2,
                        type = "radio",
                        question = "Оцените качество обслуживания",
                        required = true,
                        options = listOf("Отлично", "Хорошо", "Удовлетворительно", "Плохо")
                    ),
                    Question(
                        id = 3,
                        type = "textarea",
                        question = "Что мы можем улучшить?",
                        required = false
                    )
                )
            )
        )
    }
}
