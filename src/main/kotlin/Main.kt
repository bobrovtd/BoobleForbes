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
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

@Serializable
data class Form(
    val id: Long? = null,
    val title: String,
    val description: String = ""
)

fun main() {
    embeddedServer(
        Netty,
        port = 8080,
        host = "0.0.0.0"
    ) {
        module()
    }.start(wait = true)
}

fun Application.module() {
    install(ContentNegotiation) {
        json(
            Json {
                prettyPrint = true
            }
        )
    }

    install(CORS) {
        anyHost() // для учебного проекта ок
        allowHeader(HttpHeaders.ContentType)
        allowMethod(HttpMethod.Get)
        allowMethod(HttpMethod.Post)
    }

    routing {
        // health-check
        get("/") {
            call.respondText("BoobleForbes backend is running", ContentType.Text.Plain)
        }

        // простая заглушка API форм
        get("/api/forms") {
            val demoForms = listOf(
                Form(id = 1, title = "Первая форма", description = "Пример формы"),
                Form(id = 2, title = "Вторая форма", description = "Еще один пример")
            )
            call.respond(demoForms)
        }
    }
}
