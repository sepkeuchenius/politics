import utils
import vertexai
import json
from vertexai.language_models import TextGenerationModel
from google.oauth2 import service_account
FAILED_SUMMARIES = []

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
    return response.text


def get_doc(id: str) -> dict:
    return utils.COLLECTION.document(id)


def _save_failed_summary(doc_id):
    with open("pre_processing/failed_summaries.json", "r") as failed_docs_file:
        failed_docs: list = json.load(failed_docs_file)
        failed_docs.append(doc_id)
        FAILED_SUMMARIES.append(doc_id)
        with open("pre_processing/failed_summaries.json", "w") as failed_docs_file:
            json.dump(failed_docs, failed_docs_file)


def annotate_doc_with_summary(doc):
    print(f"Summarizing doc {doc.id}")
    summary = summarize_doc(doc.to_dict())
    print(summary)
    if len(summary) > 2:
        doc.reference.update({"summary": summary})
    else:
        _save_failed_summary(doc.id)
        print("Failed to generate summary")


def stream_docs():
    try:
        stream = utils.COLLECTION.order_by("Datum").stream()
        for index, doc in enumerate(stream):
            if index >= 5000:
                break
            if "summary" not in doc.to_dict() and doc.id not in FAILED_SUMMARIES:
                print(index)
                annotate_doc_with_summary(doc)
    except Exception:
        stream_docs()


def _load_failed_summaries():
    global FAILED_SUMMARIES
    with open("pre_processing/failed_summaries.json") as failed_summaries_file:
        FAILED_SUMMARIES = json.load(failed_summaries_file)


_load_failed_summaries()
stream_docs()
