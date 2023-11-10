from utils import COLLECTION, FIRESTORE_DB
# from firebase_admin.firestore import FieldFilter

batch = FIRESTORE_DB.batch()
docs = []
for doc in COLLECTION.where("index", ">=", 0).stream():
    doc_dict = doc.to_dict()
    if not ("members" in doc_dict or "Onderwerp" in doc_dict) and "year" not in doc_dict:
        batch.delete(doc.reference)
        docs.append(doc_dict)
batch.commit()