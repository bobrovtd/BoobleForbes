import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import kotlin.test.*

class FormRoutesCrudTest {

    @BeforeTest
    fun clean() = resetFormRepository()

    private fun ApplicationTestBuilder.jsonClient(): HttpClient = createClient {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    private fun sampleForm(title: String = "Survey"): FormUpsertRequest = FormUpsertRequest(
        title = title,
        description = "Describe me",
        questions = listOf(
            Question(type = "text", question = "Name", required = true),
            Question(type = "radio", question = "Pick one", options = listOf("A", "B"))
        )
    )

    private suspend fun HttpClient.createForm(title: String = "Survey"): Form {
        val response = post("/api/forms") {
            contentType(ContentType.Application.Json)
            setBody(sampleForm(title))
        }
        assertEquals(HttpStatusCode.Created, response.status)
        return response.body()
    }

    @Test
    fun `POST creates form and allows fetching it`() = testApplication {
        application { module() }
        val client = jsonClient()

        val created = client.createForm("Client form")

        assertNotNull(created.id)
        assertEquals(listOf(1L, 2L), created.questions.map { it.id })

        val fetched: Form = client.get("/api/forms/${created.id}").body()
        assertEquals(created.title, fetched.title)
        assertEquals(created.questions.size, fetched.questions.size)
    }

    @Test
    fun `PUT updates existing form`() = testApplication {
        application { module() }
        val client = jsonClient()
        val created = client.createForm("Original")

        val updateReq = FormUpsertRequest(
            title = "Updated",
            description = "Updated desc",
            questions = listOf(
                Question(
                    id = created.questions.first().id,
                    type = "text",
                    question = "Updated question",
                    required = true
                ),
                Question(type = "dropdown", question = "Another one", options = listOf("X", "Y"))
            )
        )

        val response = client.put("/api/forms/${created.id}") {
            contentType(ContentType.Application.Json)
            setBody(updateReq)
        }

        assertEquals(HttpStatusCode.OK, response.status)
        val updated: Form = response.body()
        assertEquals("Updated", updated.title)
        assertEquals("Updated desc", updated.description)
        assertEquals(listOf(created.questions.first().id, 2L), updated.questions.map { it.id })
        assertEquals("Updated question", updated.questions.first().question)
    }

    @Test
    fun `DELETE removes form`() = testApplication {
        application { module() }
        val client = jsonClient()
        val created = client.createForm("To delete")

        val deleteResp = client.delete("/api/forms/${created.id}")
        assertEquals(HttpStatusCode.NoContent, deleteResp.status)

        val afterDelete = client.get("/api/forms/${created.id}")
        assertEquals(HttpStatusCode.NotFound, afterDelete.status)
    }

    @Test
    fun `POST response stores answers and returns 201`() = testApplication {
        application { module() }
        val client = jsonClient()
        val created = client.createForm("With responses")

        val submitReq = SubmitResponseRequest(
            answers = mapOf("0" to "Hello", "1" to "A")
        )

        val resp = client.post("/api/forms/${created.id}/responses") {
            contentType(ContentType.Application.Json)
            setBody(submitReq)
        }

        assertEquals(HttpStatusCode.Created, resp.status)
        val saved: FormResponse = resp.body()
        assertNotNull(saved.id)
        assertEquals("Hello", saved.answers["0"])

        val responses: List<FormResponse> = client.get("/api/forms/${created.id}/responses").body()
        assertEquals(1, responses.size)
        assertEquals(saved.id, responses.first().id)
    }

    @Test
    fun `invalid id returns bad request`() = testApplication {
        application { module() }
        val client = jsonClient()

        assertEquals(HttpStatusCode.BadRequest, client.get("/api/forms/not-a-number").status)

        val badResponse = client.post("/api/forms/NaN/responses") {
            contentType(ContentType.Application.Json)
            setBody(SubmitResponseRequest(answers = emptyMap()))
        }
        assertEquals(HttpStatusCode.BadRequest, badResponse.status)
    }

    @Test
    fun `operations on missing form return not found`() = testApplication {
        application { module() }
        val client = jsonClient()

        val update = client.put("/api/forms/9999") {
            contentType(ContentType.Application.Json)
            setBody(sampleForm("Missing"))
        }
        assertEquals(HttpStatusCode.NotFound, update.status)

        val delete = client.delete("/api/forms/9999")
        assertEquals(HttpStatusCode.NotFound, delete.status)

        val responses = client.get("/api/forms/9999/responses")
        assertEquals(HttpStatusCode.NotFound, responses.status)
    }
}
