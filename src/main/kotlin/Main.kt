import io.ktor.server.application.*
import io.ktor.server.engine.*
import io.ktor.server.netty.*
import io.ktor.server.plugins.contentnegotiation.*
import io.ktor.server.plugins.cors.routing.*
import io.ktor.server.routing.*
import io.ktor.server.response.*
import io.ktor.server.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.http.content.*
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.time.Instant
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

// ---------- Модели ----------

@Serializable
data class Question(
    val id: Long? = null,
    val type: String,          // "text", "textarea", "radio", "checkbox", "dropdown"
    val question: String,
    val required: Boolean = false,
    val options: List<String> = emptyList()
)

@Serializable
data class FormResponse(
    val id: Long? = null,
    val timestamp: String? = null,
    val answers: Map<String, String>  // ключ: индекс вопроса (как строка) или id
)

@Serializable
data class Form(
    val id: Long? = null,
    val title: String,
    val description: String = "",
    val questions: List<Question> = emptyList(),
    val responses: List<FormResponse> = emptyList()
)

// DTO для создания/обновления формы
@Serializable
data class FormUpsertRequest(
    val title: String,
    val description: String = "",
    val questions: List<Question> = emptyList()
)

// DTO для отправки ответа
@Serializable
data class SubmitResponseRequest(
    val answers: Map<String, String>
)

object FormRepository {
    private val forms = ConcurrentHashMap<Long, Form>()
    private val formIdSeq = AtomicLong(1)
    private val responseIdSeq = AtomicLong(1)

    fun getAll(): List<Form> = forms.values.sortedBy { it.id }

    fun get(id: Long): Form? = forms[id]

    fun create(req: FormUpsertRequest): Form {
        val id = formIdSeq.getAndIncrement()
        val questionsWithIds = req.questions.mapIndexed { index, q ->
            q.copy(id = index.toLong() + 1)
        }
        val form = Form(
            id = id,
            title = req.title,
            description = req.description,
            questions = questionsWithIds,
            responses = emptyList()
        )
        forms[id] = form
        return form
    }

    fun update(id: Long, req: FormUpsertRequest): Form? {
        val existing = forms[id] ?: return null
        val questionsWithIds = req.questions.mapIndexed { index, q ->
            q.copy(id = q.id ?: (index.toLong() + 1))
        }
        val updated = existing.copy(
            title = req.title,
            description = req.description,
            questions = questionsWithIds
        )
        forms[id] = updated
        return updated
    }

    fun delete(id: Long): Boolean {
        return forms.remove(id) != null
    }

    fun addResponse(formId: Long, req: SubmitResponseRequest): FormResponse? {
        val form = forms[formId] ?: return null
        val responseId = responseIdSeq.getAndIncrement()
        val response = FormResponse(
            id = responseId,
            timestamp = Instant.now().toString(),
            answers = req.answers
        )
        val updatedForm = form.copy(
            responses = form.responses + response
        )
        forms[formId] = updatedForm
        return response
    }

    fun getResponses(formId: Long): List<FormResponse>? {
        val form = forms[formId] ?: return null
        return form.responses
    }

    fun seedDemo() {
        if (forms.isNotEmpty()) return

        val demoForm = create(
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
                        question = "Как вы оцениваете наш сервис?",
                        required = true,
                        options = listOf("Отлично", "Хорошо", "Удовлетворительно", "Плохо")
                    ),
                    Question(
                        id = 3,
                        type = "textarea",
                        question = "Какие у вас предложения по улучшению?",
                        required = false
                    )
                )
            )
        )

        addResponse(
            demoForm.id!!,
            SubmitResponseRequest(
                answers = mapOf(
                    "0" to "Иван Петров",
                    "1" to "Отлично",
                    "2" to "Все отлично, спасибо!"
                )
            )
        )
    }
}

// ---------- Точка входа ----------

fun main() {
    embeddedServer(
        Netty,
        port = 8080,
        host = "0.0.0.0"
    ) {
        module()
    }.start(wait = true)
}

// ---------- Конфигурация приложения ----------

fun Application.module() {
    install(ContentNegotiation) {
        json(
            Json {
                prettyPrint = true
                ignoreUnknownKeys = true
                isLenient = true
            }
        )
    }

    install(CORS) {
        anyHost() // для учебного проекта ок
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
        allowMethod(HttpMethod.Put)
        allowMethod(HttpMethod.Delete)
    }

    FormRepository.seedDemo()

    routing {
        // --- статика: index.html ---
        staticResources("/", "static", "index.html")

        // --- REST API для форм ---
        route("/api/forms") {

            get {
                call.respond(FormRepository.getAll())
            }

            post {
                val req = call.receive<FormUpsertRequest>()
                val created = FormRepository.create(req)
                call.respond(HttpStatusCode.Created, created)
            }

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

            get("{id}/responses") {
                val id = call.parameters["id"]?.toLongOrNull()
                if (id == null) {
                    call.respond(HttpStatusCode.BadRequest, "Invalid id")
                    return@get
                }

                val responses = FormRepository.getResponses(id)
                if (responses == null) {
                    call.respond(HttpStatusCode.NotFound, "Form not found")
                } else {
                    call.respond(responses)
                }
            }

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
        }
    }
}
