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
    }
    ,
    "BBB": {
        "SKIP_PAGES" : 1,
        "MARGIN_SIZE" : 50,
        "PAR_MARGIN" : 20,
    },
    "VVD": {
        "SKIP_PAGES" : 1,
        "MARGIN_SIZE" : 50,
        "PAR_MARGIN" : 20,
    }
}