import io.ktor.client.*
import io.ktor.client.call.*
import io.ktor.client.plugins.contentnegotiation.*
import io.ktor.client.request.*
import io.ktor.http.*
import io.ktor.serialization.kotlinx.json.*
import io.ktor.server.testing.*
import kotlinx.serialization.json.Json
import kotlin.test.*

class FormRoutesBasicTest {

    private fun ApplicationTestBuilder.testClient(): HttpClient = createClient {
        install(ContentNegotiation) {
            json(Json { ignoreUnknownKeys = true })
        }
    }

    @BeforeTest
    fun clean() = resetFormRepository()

    @Test
    fun `GET forms returns list`() = testApplication {
        application { module() }

        val client = testClient()
        val resp = client.get("/api/forms")

        assertEquals(HttpStatusCode.OK, resp.status)
        val list: List<Form> = resp.body()

        assertTrue(list.isNotEmpty()) // seedDemo всегда добавляет одну форму
    }

    @Test
    fun `GET non-existing form returns 404`() = testApplication {
        application { module() }

        val client = testClient()
        val resp = client.get("/api/forms/9999")

        assertEquals(HttpStatusCode.NotFound, resp.status)
    }
}
