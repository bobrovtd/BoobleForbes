import kotlin.test.*

class FormRepositoryTest {

    @BeforeTest
    fun clean() = resetFormRepository()

    @Test
    fun `create form should assign ids and save it`() {
        val req = FormUpsertRequest(
            title = "Test",
            description = "Desc",
            questions = listOf(
                Question(type = "text", question = "Q1"),
                Question(type = "radio", question = "Q2", options = listOf("A", "B"))
            )
        )

        val form = FormRepository.create(req)

        assertNotNull(form.id)
        assertEquals("Test", form.title)
        assertEquals(2, form.questions.size)
        assertEquals(1L, form.questions[0].id)
        assertEquals(2L, form.questions[1].id)
    }

    @Test
    fun `update form should modify fields`() {
        val created = FormRepository.create(
            FormUpsertRequest(
                title = "Old",
                description = "D",
                questions = listOf(Question(type = "text", question = "Q1"))
            )
        )

        val updated = FormRepository.update(
            created.id!!,
            FormUpsertRequest(
                title = "New",
                description = "X",
                questions = listOf(
                    Question(id = 10, type = "text", question = "Changed"),
                    Question(type = "radio", question = "Q2", options = listOf("1", "2"))
                )
            )
        )

        assertEquals("New", updated!!.title)
        assertEquals("X", updated.description)
        assertEquals(10L, updated.questions[0].id)
        assertEquals(2L, updated.questions[1].id)
    }

    @Test
    fun `delete should remove form`() {
        val f = FormRepository.create(
            FormUpsertRequest("Del", questions = emptyList())
        )
        assertTrue(FormRepository.delete(f.id!!))
        assertNull(FormRepository.get(f.id))
    }

    @Test
    fun `addResponse should work`() {
        val f = FormRepository.create(
            FormUpsertRequest("Form", questions = listOf(Question(type = "text", question = "Q1")))
        )

        val resp = FormRepository.addResponse(
            f.id!!,
            SubmitResponseRequest(mapOf("0" to "Hello"))
        )

        assertNotNull(resp)
        assertEquals("Hello", resp!!.answers["0"])
        assertEquals(1, FormRepository.getResponses(f.id!!)!!.size)
    }
}
