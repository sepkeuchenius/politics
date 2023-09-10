The preprocessing folder contains python scripts to download, analyze and ingest relevant information.

find_docs.py downloads motions from the tweede kamer ODATA database and writes them to json containing their text and metadata in the data folder
find_pars_in_doc.py contains code to digest a pdf and return paragraphs in json
ingest_motions.py takes data from the data folder and ingests them into firebase
ingest_programs.py takes data from the data folder (programs in PDF), uses utils to parse them and then uploads them to firebase

MOTION {
    "text"
    "member"
    "metadata"
}

PROGRAM PARAGRAPH {
    "text", the text in the paragraph
    "party", the party who published the program
    "year", the year of the elections
    "index", the index of the paragraph in the doc
    "concept", whether or not this is a concept program 
}