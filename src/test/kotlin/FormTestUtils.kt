import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicLong

fun resetFormRepository() {
    val repoClass = FormRepository::class.java

    val formsField = repoClass.getDeclaredField("forms").apply { isAccessible = true }
    @Suppress("UNCHECKED_CAST")
    val forms = formsField.get(FormRepository) as ConcurrentHashMap<Long, Form>
    forms.clear()

    val formIdSeqField = repoClass.getDeclaredField("formIdSeq").apply { isAccessible = true }
    val formIdSeq = formIdSeqField.get(FormRepository) as AtomicLong
    formIdSeq.set(1)

    val respIdSeqField = repoClass.getDeclaredField("responseIdSeq").apply { isAccessible = true }
    val respIdSeq = respIdSeqField.get(FormRepository) as AtomicLong
    respIdSeq.set(1)
}
