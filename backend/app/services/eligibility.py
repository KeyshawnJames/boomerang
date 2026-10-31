"""The eligibility gate. The server decides; the app only previews it."""

from collections.abc import Sequence

from sqlmodel import Session, select

from app.models import AnswerOutcome, EligibilityQuestion, Locale, ReturnEligibilityAnswer


class InvalidAnswers(Exception):
    """An active question has no answer, or an answer names an unknown question or option."""


def active_questions(session: Session) -> Sequence[EligibilityQuestion]:
    return session.exec(
        select(EligibilityQuestion)
        .where(EligibilityQuestion.active)
        .order_by(EligibilityQuestion.sort_order)
    ).all()


def policy_version(questions: Sequence[EligibilityQuestion]) -> int:
    # A changed or added question takes the next version, so the highest names the set.
    # shortcut: retiring the newest question lowers it; bump another until an admin tool.
    return max((q.version for q in questions), default=0)


def evaluate(
    questions: Sequence[EligibilityQuestion], answers: dict[str, str], locale: Locale
) -> list[ReturnEligibilityAnswer]:
    """One answer row per question, in question order, its text copied in the language
    the client read it in.

    The rows have no return_id yet: the caller sets it once it knows the return.
    """
    if set(answers) != {q.code for q in questions}:
        raise InvalidAnswers
    en = locale == Locale.en
    rows = []
    for q in questions:
        option = next((o for o in q.options if o["value"] == answers[q.code]), None)
        if option is None:
            raise InvalidAnswers
        rows.append(
            ReturnEligibilityAnswer(
                question_code=q.code,
                prompt_snapshot=q.prompt_en if en else q.prompt_fr,
                answer_value=option["value"],
                answer_label_snapshot=option["label_en"] if en else option["label_fr"],
                outcome=AnswerOutcome(option["outcome"]),
            )
        )
    return rows
