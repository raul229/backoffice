"""
Datos y mapas de coordenadas para los contratos de Entel.

Estructura:
- PLANES_ENTEL: tarifas por plan y velocidad.
- COORDS_ENTEL_PAGINA_*: mapas de coordenadas por página lógica.

Cada mapa tiene la forma:
    {nombre_campo: (x, y, opciones)}

Opciones disponibles:
    - 'value'          texto fijo que se imprime literalmente
    - 'field'          nombre real del dato (default: el nombre del campo)
    - 'transform'      función nombrada que produce el texto
    - 'tamano'         tamaño de fuente (default 12)
    - 'max_caracteres' si está presente, divide el texto en varias líneas

Resolución de un valor (en `GeneradorEntel._resolver_valor`):
    1. 'value' literal
    2. 'transform' aplicado al contexto + datos del generador
    3. campo del contexto del cliente (JSON)
    4. campo de los datos del generador (plan, renta, etc.)
"""

PLANES_ENTEL = {
    'Internet Empresas': {
        200: {'renta': 90.00, 'descuento': 22.88},
        300: {'renta': 120.00, 'descuento': 30.51},
        500: {'renta': 150.00, 'descuento': 38.14},
        1000: {'renta': 180.00, 'descuento': 45.76},
    },
    'Pack Empresas': {
        200: {'renta': 99.90, 'descuento': 25.40},
        300: {'renta': 129.90, 'descuento': 33.03},
        500: {'renta': 159.90, 'descuento': 40.65},
        1000: {'renta': 189.90, 'descuento': 48.28},
    },
}


# --------------------------------------------------
# PROMOCIONES DISPONIBLES
# --------------------------------------------------
# Cada promoción es la clave para resolver los anexos a llenar.
# Las restricciones (p.ej. 1000 Mbps no admite bono) se manejan en
# `obtener_plantillas` consultando `_promociones_permitidas`.

PROMOCIONES_ENTEL = [
    'bono de velocidad por 6m',
    'Solo 30% por 6m.',
    '30% y bono de velocidad por 6m',
]


# --------------------------------------------------
# REGLAS DE PROMOCIONES PERMITIDAS POR VELOCIDAD
# --------------------------------------------------
# Velocidades donde el bono de velocidad NO está disponible
# (porque ya es la máxima oferta posible).

VELOCIDADES_SIN_BONO = {1000}


# --------------------------------------------------
# TABLA DE ANEXOS POR PLAN x VELOCIDAD x PROMOCION
# --------------------------------------------------
# Estructura:
#   { (plan, velocidad, promocion): [archivos_pdf_a_llenar] }
#
# El archivo base 'contratos.pdf' se incluye SIEMPRE. Las entradas
# listan los anexos adicionales según la promoción.
#
# Ejemplo de uso:
#   ('Internet Empresas', 200, 'bono de velocidad por 6m')
#       -> solo aplica el anexo de bono
#   ('Internet Empresas', 200, '30% y bono de velocidad por 6m')
#       -> aplica bono + descuento
#   ('Internet Empresas', 1000, 'Solo 30% por 6m.')
#       -> solo el anexo de descuento (1000 no admite bono)

ANEXOS_POR_COMBINACION: dict[tuple[str, int, str], list[str]] = {
    # Internet Empresas
    ('Internet Empresas', 200,  'bono de velocidad por 6m'):      ['bono duplica.pdf'],
    ('Internet Empresas', 200,  'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 200,  '30% y bono de velocidad por 6m'): ['bono duplica.pdf', 'promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 300,  'bono de velocidad por 6m'):      ['bono duplica.pdf'],
    ('Internet Empresas', 300,  'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 300,  '30% y bono de velocidad por 6m'): ['bono duplica.pdf', 'promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 500,  'bono de velocidad por 6m'):      ['bono duplica.pdf'],
    ('Internet Empresas', 500,  'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 500,  '30% y bono de velocidad por 6m'): ['bono duplica.pdf', 'promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 1000, 'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Internet Empresas', 1000, '30% y bono de velocidad por 6m'): ['promocion 30 x 6 meses.pdf'],

    # Pack Empresas (mismas reglas)
    ('Pack Empresas', 200,  'bono de velocidad por 6m'):      ['bono duplica.pdf'],
    ('Pack Empresas', 200,  'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 200,  '30% y bono de velocidad por 6m'): ['bono duplica.pdf', 'promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 300,  'bono de velocidad por 6m'):      ['bono duplica.pdf'],
    ('Pack Empresas', 300,  'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 300,  '30% y bono de velocidad por 6m'): ['bono duplica.pdf', 'promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 500,  'bono de velocidad por 6m'):      ['bono duplica.pdf'],
    ('Pack Empresas', 500,  'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 500,  '30% y bono de velocidad por 6m'): ['bono duplica.pdf', 'promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 1000, 'Solo 30% por 6m.'):              ['promocion 30 x 6 meses.pdf'],
    ('Pack Empresas', 1000, '30% y bono de velocidad por 6m'): ['promocion 30 x 6 meses.pdf'],
}

ARCHIVOS_BASE_POR_PLAN: dict[str, str] = {
    'Internet Empresas': 'internet empresas.pdf',
    'Pack Empresas': 'pack empresas.pdf',
}


# --------------------------------------------------
# HOJA DE CALIFICACIÓN (HC) — .xlsm a llenar por plan
# --------------------------------------------------
# Campos compartidos por ambos planes:
#   RUC, RAZON_SOCIAL, SIRO, NO_OPORTUNIDAD
# Campos exclusivos de Internet Empresas:
#   NRO_PSI
# Campos exclusivos de Pack Empresas:
#   OIT, COTIZACION, CONTRATO

HC_ARCHIVO_POR_PLAN: dict[str, str] = {
    'Internet Empresas': 'HC-EMPRESAS.xlsm',
    'Pack Empresas': 'HC-PACK.xlsm',
}

HC_COORDS_POR_PLAN: dict[str, dict[str, tuple[str, str]]] = {
    'Internet Empresas': {
        'RUC':            ('Formulario', 'F7'),
        'RAZON_SOCIAL':   ('Formulario', 'P7'),
        'SIRO':           ('Formulario', 'P8'),
        'NO_OPORTUNIDAD': ('Formulario', 'P9'),
        'NRO_PSI':        ('Formulario', 'P11'),
    },
    'Pack Empresas': {
        'RUC':            ('Formulario', 'F7'),
        'RAZON_SOCIAL':   ('Formulario', 'P7'),
        'SIRO':           ('Formulario', 'P8'),
        'NO_OPORTUNIDAD': ('Formulario', 'P9'),
        'OIT':            ('Formulario', 'G65'),
        'COTIZACION':     ('Formulario', 'F9'),
        'CONTRATO':       ('Formulario', 'F10'),
    },
}


# --------------------------------------------------
# PLANTILLA DE CORREO (.eml)
# --------------------------------------------------
# Plantilla Jinja2 con bloques subject, from, to, cc, bcc, body.

PLANTILLA_CORREO_ENTEL = 'correo_contrato.eml'

# Claves estables para la API/UI. El campo `archivo` es el nombre que usa el generador.
CATALOGO_PLANTILLAS_ENTEL = [
    {
        "clave": "internet-empresas",
        "archivo": ARCHIVOS_BASE_POR_PLAN["Internet Empresas"],
        "etiqueta": "Contrato Internet Empresas",
        "descripcion": "PDF base del plan Internet Empresas.",
        "grupo": "Contratos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "pack-empresas",
        "archivo": ARCHIVOS_BASE_POR_PLAN["Pack Empresas"],
        "etiqueta": "Contrato Pack Empresas",
        "descripcion": "PDF base del plan Pack Empresas.",
        "grupo": "Contratos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "bono-duplica",
        "archivo": "bono duplica.pdf",
        "etiqueta": "Anexo bono duplica velocidad",
        "descripcion": "Anexo de promoción por bono de velocidad.",
        "grupo": "Anexos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "promocion-30",
        "archivo": "promocion 30 x 6 meses.pdf",
        "etiqueta": "Anexo 30% por 6 meses",
        "descripcion": "Anexo de descuento del 30% por 6 meses.",
        "grupo": "Anexos",
        "acepta": [".pdf"],
        "requerida": True,
    },
    {
        "clave": "hc-empresas",
        "archivo": HC_ARCHIVO_POR_PLAN["Internet Empresas"],
        "etiqueta": "Hoja de calificación Internet Empresas",
        "descripcion": "Excel macro (.xlsm) de calificación para Internet Empresas.",
        "grupo": "Hojas de calificación",
        "acepta": [".xlsm"],
        "requerida": False,
    },
    {
        "clave": "hc-pack",
        "archivo": HC_ARCHIVO_POR_PLAN["Pack Empresas"],
        "etiqueta": "Hoja de calificación Pack Empresas",
        "descripcion": "Excel macro (.xlsm) de calificación para Pack Empresas.",
        "grupo": "Hojas de calificación",
        "acepta": [".xlsm"],
        "requerida": False,
    },
    {
        "clave": "correo-entel",
        "archivo": PLANTILLA_CORREO_ENTEL,
        "etiqueta": "Plantilla de correo",
        "descripcion": "Correo .eml que se incluye en el ZIP con los PDFs adjuntos.",
        "grupo": "Correo",
        "acepta": [".eml"],
        "requerida": False,
    },
]

ITEM_PLANTILLA_POR_CLAVE = {item["clave"]: item for item in CATALOGO_PLANTILLAS_ENTEL}
CLAVE_PLANTILLA_POR_ARCHIVO = {item["archivo"]: item["clave"] for item in CATALOGO_PLANTILLAS_ENTEL}


# --------------------------------------------------
# MAPAS DE COORDENADAS POR PÁGINA LÓGICA
# --------------------------------------------------

COORDS_ENTEL_PAGINA_1: dict[str, tuple[int, int, dict]] = {
    'RAZON_SOCIAL':          (20, 260, {'tamano': 9, 'max_caracteres': 40}),
    'RUC':                   (50, 295, {}),
    'RRLL':                  (20, 350, {'max_caracteres': 40}),
    'DOCUMENTO_Y_DNI':       (25, 400, {'transform': 'doc_y_dni'}),
    'CORREO_RRLL':           (25, 430, {}),
    'CELULAR_RRLL':          (25, 460, {}),
    'DOMICILIO_INSTALACION': (20, 513, {'max_caracteres': 60, 'tamano': 8}),
    'DOMICILIO_INSTALACION_2': (20, 563, {'max_caracteres': 60, 'tamano': 8}),
    'VELOCIDADES':           (330, 440, {'transform': 'velocidades'}),
    'RUC_2':                 (110, 610, {'field': 'RUC'}),
    'NOMBRE_PLAN':           (140, 625, {'transform': 'nombre_plan'}),
    'PROMOCION':             (140, 640, {'field': '_PROMOCION'}),
    'CHECK_SERVICIO_NUEVO':  (25, 665, {'value': 'X'}),
    'RENTA_FIJA':            (243, 712, {'field': '_RENTA_FIJA'}),
}

COORDS_ENTEL_PAGINA_1_PACK_EMPRESAS: dict[str, tuple[int, int, dict]] = {
    'RENTA_FIJA':            (525, 44, {'field': '_RENTA_FIJA'}),
    'RAZON_SOCIAL':          (45, 285, {'tamano': 9, 'max_caracteres': 40}),
    'RUC':                   (145, 315, {}),        
    'RRLL':                  (45, 355, {'max_caracteres': 40}),
    'DOCUMENTO_Y_DNI':       (45, 400, {'transform': 'doc_y_dni'}),
    'CORREO_RRLL':           (45, 430, {}),
    'DOMICILIO_INSTALACION': (45, 478, {'max_caracteres': 60, 'tamano': 8}),
    
    ##solo se muestra una direccion, falla direccion de instalacion
    'DOMICILIO_INSTALACION_2': (45, 530 , {'max_caracteres': 60, 'tamano': 8}),
    
    ###falta numero de telefono fijo
    'NUMERO_FIJO':           (115, 570, {}),   
    
    'PRECIO_INTERNET_FIJO':  (480, 435, {'value': 'S/. 9.90'}),
    'PRECIO_TELEFONO_FIJO':  (480, 445, {'transform': 'precio_int_solo'}),
    
    'RUC_2':                 (145, 585, {'field': 'RUC'}),
    'NOMBRE_PLAN':           (178, 600, {'transform': 'nombre_plan'}),
    'PROMOCION':             (178, 615, {'field': '_PROMOCION'}),
    'CHECK_SERVICIO_NUEVO':  (50, 645, {'value': 'X'}),
}

COORDS_ENTEL_PAGINA_2_PACK_EMPRESAS: dict[str, tuple[int, int, dict]] = {


    'TOTAL_TARIFA_MENSUAL':  (253, 188, {'value': '0'}),
    'LDN':                   (253, 292, {'value': '1'}),
    'LDI':                   (253, 310, {'value': '1'}),
    'TOTAL_TARIFA_UNICA':    (253, 345, {'value': '0'}),
    'VELOCIDADES':           (50, 525, {'transform': 'velocidades'}),
    
}

COORDS_ENTEL_PAGINA_3_PACK_EMPRESAS: dict[str, tuple[int, int, dict]] = {
    'RRLL':  (465, 410, {'max_caracteres': 17}),
    'CARGO': (465, 440, {'value': 'GERENTE GENERAL'}),
    'FECHA': (370, 465, {}),
    'HORA':  (495, 465, {'value': '10  00  00'}),
}


COORDS_ENTEL_PAGINA_3: dict[str, tuple[int, int, dict]] = {
    'RRLL':  (195, 300, {'max_caracteres': 17}),
    'CARGO': (195, 330, {'value': 'GERENTE GENERAL'}),
    'FECHA': (60, 345, {}),
    'HORA':  (220, 345, {'value': '10 : 00 : 00'}),
}

COORDS_ENTEL_PAGINA_5: dict[str, tuple[int, int, dict]] = {
    'RRLL':         (40, 510, {'max_caracteres': 17}),
    'DNI':          (180, 510, {}),
    'CARGO':        (260, 498, {'value': 'GERENTE\nGENERAL'}),
    'CELULAR_RRLL': (350, 510, {'max_caracteres': 10}),
    'CORREO_RRLL':  (436, 510, {'tamano': 9, 'max_caracteres': 27}),
    'DIA_MES_ANIO': (200, 640, {'transform': 'dia_mes_anio'}),
    'RRLL_2':       (90, 710, {'field': 'RRLL', 'tamano': 10}),
    'CARGO_2':      (100, 730, {'value': 'GERENTE GENERAL'}),
}

COORDS_ENTEL_PAGINA_6: dict[str, tuple[int, int, dict]] = {
    'FECHA':                 (120, 185, {}),
    'RUC':                   (230, 215, {}),
    'RAZON_SOCIAL':          (225, 240, {'max_caracteres': 50, 'tamano': 10}),
    'RRLL':                  (230, 260, {'tamano': 10}),
    'CELULAR_RRLL':          (230, 280, {'tamano': 10}),
    'DOMICILIO_INSTALACION': (80, 340, {'max_caracteres': 70, 'tamano': 12}),
}

COORDS_ENTEL_PAGINA_7: dict[str, tuple[int, int, dict]] = {
    'FECHA':                 (120, 185, {}),
    'RUC':                   (230, 225, {}),
    'RAZON_SOCIAL':          (225, 248, {'max_caracteres': 50, 'tamano': 10}),
    'RRLL':                  (230, 270, {'tamano': 10}),
    'CELULAR_RRLL':          (230, 290, {'tamano': 10}),
    'DOMICILIO_INSTALACION': (80, 350, {'max_caracteres': 70, 'tamano': 12}),
    'DESCUENTO':             (230, 430, {'transform': 'descuento'}),
}


# --------------------------------------------------
# MAPAS POR ARCHIVO PDF
# --------------------------------------------------
# {nombre_archivo_pdf: {num_pagina_fisica: mapa_de_coordenadas}}
#
# El archivo base contiene el cuerpo del contrato (páginas 1, 3 y 5).
# Los anexos viven en archivos separados, cada uno con su mapa.
# `ANEXOS_POR_COMBINACION` decide cuáles anexos se llenan según
# la combinación plan × velocidad × promoción elegida.

MAPA_ENTEL_POR_ARCHIVO: dict[str, dict[int, dict]] = {
    'internet empresas.pdf': {
        0: COORDS_ENTEL_PAGINA_1,
        2: COORDS_ENTEL_PAGINA_3,
        4: COORDS_ENTEL_PAGINA_5,
    },
    'pack empresas.pdf': {
        0: COORDS_ENTEL_PAGINA_1_PACK_EMPRESAS,
        1: COORDS_ENTEL_PAGINA_2_PACK_EMPRESAS,
        2: COORDS_ENTEL_PAGINA_3_PACK_EMPRESAS,
        4: COORDS_ENTEL_PAGINA_5,
    },
    'bono duplica.pdf': {
        0: COORDS_ENTEL_PAGINA_6,
    },
    'promocion 30 x 6 meses.pdf': {
        0: COORDS_ENTEL_PAGINA_7,
    },
}
