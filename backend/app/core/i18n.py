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
    "upload_link_invalid": {
        Locale.en: "This upload link has expired or was already used. Add the photo again.",
        Locale.fr: (
            "Ce lien de téléversement a expiré ou a déjà servi. Ajoutez la photo de nouveau."
        ),
    },
    "wrong_photo_type": {
        Locale.en: "This photo's file type doesn't match. Use a JPEG, PNG or HEIC photo.",
        Locale.fr: "Le type de fichier ne correspond pas. Utilisez une photo JPEG, PNG ou HEIC.",
    },
    "photo_too_large": {
        Locale.en: "This photo is too large. Try a smaller one.",
        Locale.fr: "Cette photo est trop volumineuse. Essayez-en une plus petite.",
    },
    "retailer_not_found": {
        Locale.en: "Choose a retailer from the list.",
        Locale.fr: "Choisissez un détaillant dans la liste.",
    },
    "invalid_answers": {
        Locale.en: "Some questions changed or weren't answered. Review your answers.",
        Locale.fr: "Certaines questions ont changé ou sont sans réponse. Revoyez vos réponses.",
    },
    "return_blocked": {
        Locale.en: "We can't pick up this return. Check the answers that block it.",
        Locale.fr: "Nous ne pouvons pas collecter ce retour. Vérifiez les réponses en cause.",
    },
    "warnings_not_acknowledged": {
        Locale.en: "Confirm that you've read the warnings.",
        Locale.fr: "Confirmez que vous avez lu les avertissements.",
    },
    "attestation_required": {
        Locale.en: "Confirm that your answers are accurate.",
        Locale.fr: "Confirmez que vos réponses sont exactes.",
    },
    "phone_required": {
        Locale.en: "Add a phone number so the driver can reach you.",
        Locale.fr: "Ajoutez un numéro de téléphone pour que le chauffeur puisse vous joindre.",
    },
    "slot_unavailable": {
        Locale.en: "This pickup time is no longer available. Choose another.",
        Locale.fr: "Cette plage de collecte n'est plus offerte. Choisissez-en une autre.",
    },
    "address_expired": {
        Locale.en: "Your address check has expired. Enter the address again.",
        Locale.fr: "La vérification de votre adresse a expiré. Entrez l'adresse de nouveau.",
    },
    "photo_missing": {
        Locale.en: "A photo didn't upload. Add it again.",
        Locale.fr: "Une photo n'a pas été téléversée. Ajoutez-la de nouveau.",
    },
    "return_not_found": {
        Locale.en: "This return doesn't exist.",
        Locale.fr: "Ce retour n'existe pas.",
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
