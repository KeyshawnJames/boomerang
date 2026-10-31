from fastapi import HTTPException, Request

from app.models import Locale

MESSAGES: dict[str, dict[Locale, str]] = {
    "not_authenticated": {
        Locale.en: "You are not signed in, or your session has expired.",
        Locale.fr: "Vous n'êtes pas connecté, ou votre session a expiré.",
    },
    "bad_credentials": {
        Locale.en: "Incorrect email or password.",
        Locale.fr: "Courriel ou mot de passe incorrect.",
    },
    "forbidden": {
        Locale.en: "You don't have access to this.",
        Locale.fr: "Vous n'avez pas accès à cette ressource.",
    },
    "email_taken": {
        Locale.en: "An account with this email already exists.",
        Locale.fr: "Un compte existe déjà avec ce courriel.",
    },
    "invalid_phone": {
        Locale.en: "Enter a valid phone number.",
        Locale.fr: "Entrez un numéro de téléphone valide.",
    },
    "outside_service_area": {
        Locale.en: "We don't pick up at this address yet. For now, we only serve Montreal.",
        Locale.fr: (
            "Nous ne desservons pas encore cette adresse. Pour l'instant, seulement Montréal."
        ),
    },
    "not_a_street_address": {
        Locale.en: "Choose a full street address, with the house number.",
        Locale.fr: "Choisissez une adresse complète, avec le numéro civique.",
    },
    "address_lookup_failed": {
        Locale.en: "Address search isn't working right now. Try again.",
        Locale.fr: "La recherche d'adresse ne fonctionne pas pour le moment. Réessayez.",
    },
}


def request_locale(request: Request) -> Locale:
    # Before sign-in, all we have is the device language. French is the fallback (ADR 0007).
    # shortcut: reads only the first Accept-Language entry, ignoring q-weights.
    accept = request.headers.get("accept-language", "").lower()
    return Locale.en if accept.startswith("en") else Locale.fr


def api_error(status_code: int, key: str, locale: Locale) -> HTTPException:
    headers = {"WWW-Authenticate": "Bearer"} if status_code == 401 else None
    return HTTPException(status_code, MESSAGES[key][locale], headers=headers)
