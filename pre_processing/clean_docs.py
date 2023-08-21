from utils import COLLECTION_DOCS
for doc in COLLECTION_DOCS:
    data:dict = doc.get().to_dict()
    if data.get("member"):
        print(data)
        doc.delete()
