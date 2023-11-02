import utils
import vertexai
from vertexai.language_models import TextGenerationModel
from google.oauth2 import service_account

credentials = service_account.Credentials.from_service_account_file(
    '/home/sep/Desktop/sep/politics/politics-navigator-firebase-adminsdk-sqgcn-02cac9b79c.json')

vertexai.init(project="politics-navigator", location="us-central1", credentials=credentials)
parameters = {
    "candidate_count": 1,
    "max_output_tokens": 1024,
    "temperature": 0.2,
    "top_p": 0.8,
    "top_k": 40
}
model = TextGenerationModel.from_pretrained("text-bison")


def summarize_doc(doc: dict) -> str:
    """Gets doc as dict and summarizes the text

    Args:
        doc (dict): _description_

    Returns:
        str: _description_
    """
    response = model.predict(
        f"""maak deze nederlandse motie begrijpbaar in heel simpele nederlandse taal voor mensen die niks van politiek afweten in ongeveer twee zinnen door ze te herschrijven. :
        BEGIN MOTIE
        {doc.get("text")}
        EINDE MOTIE
""",
        **parameters
    )
    print(f"Response from Model: {response.text}")


def get_doc(id: str) -> dict:
    return utils.COLLECTION.document(id).get().to_dict()


summarize_doc(get_doc("03088a77-5134-490a-a356-5a0661be6073"))

