from firebase_admin import credentials, firestore, initialize_app

cred = credentials.Certificate("politics-navigator-firebase-adminsdk-sqgcn-91f34c3f50.json")
initialize_app(cred)

firestore_db = firestore.client()
COLLECTION = firestore_db.collection('parties')
COLLECTION_DOCS =  list(COLLECTION.list_documents())

DOCS = {
    "VVD": "pre_processing/data/Verkiezingsprogramma-VVD-2021-2025.pdf",
    "D66": "pre_processing/data/d66_verkiezingsprogramma_een_nieuw_begin_2021_2025.pdf",
    "BBB": "pre_processing/data/BBB_Verkiezingsprogramma_Algemene_Programma_2023.pdf",
}
PARS = {
    "VVD": "pre_processing/out/pars_VVD.json",
    "D66": "pre_processing/out/pars_D66.json",
    "BBB": "pre_processing/out/pars_BBB.json",
}
CONFIGS = {
    "D66": {
        "SKIP_PAGES" : 4,
        "MARGIN_SIZE" : 50,
        "PAR_MARGIN" : 20,
    },
    "BBB": {
        "SKIP_PAGES" : 1,
        "MARGIN_SIZE" : 50,
        "PAR_MARGIN" : 20,
    },
    "VVD": {
        "SKIP_PAGES" : 1,
        "MARGIN_SIZE" : 50,
        "PAR_MARGIN" : 20,
    },
    "MOTION": {
        "SKIP_PAGES" : 0,
        "MARGIN_SIZE" : 100,
        "PAR_MARGIN" : 20,
    }
}



def _clean_text(text:str):
    text = text.strip().strip("\n")
    return text


def _get_doc_paragraphs(doc, doc_type):
    config = CONFIGS[doc_type]
    page_height = list(doc.pages())[0].rect.height
    pars = []
    blocks = [page.get_text("blocks") for index, page in enumerate(doc.pages()) if index >= config["SKIP_PAGES"]]
    for block in blocks:
        if len(block) > 4:
            #check if blocks inside block
            if isinstance(block, list):
                #put blocks together
                par_text = ""
                last_y = 0
                for block_piece in block:
                    if block_piece[1] < config["MARGIN_SIZE"] or block_piece[1] > (page_height - config["MARGIN_SIZE"]):
                        continue
                    if len(block_piece) <= 4 or "<" in block_piece[4]:
                        continue
                    if block_piece[1] < last_y or block_piece[1] - last_y > config["PAR_MARGIN"]:
                        if par_text and len(par_text.split()) > 3:
                            pars.append(_clean_text(par_text))
                        par_text = block_piece[4]
                    else:
                        par_text += block_piece[4]
                    last_y = block_piece[1]

            else:
                raise ValueError("Not a list")
    return pars
            