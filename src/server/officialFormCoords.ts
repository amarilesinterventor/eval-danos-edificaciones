/**
 * Mapa de coordenadas del PDF fuente "2A-Formulario regional homogenizado.pdf"
 * (612x792pt, tamano Carta) -- generado a partir de un analisis geometrico de los
 * vectores de dibujo del PDF (clusters de segmentos de linea que forman cada
 * casilla de verificacion, mas los rectangulos de relleno de color del semaforo),
 * validado cruzando cada coordenada contra capturas numeradas del formulario.
 * Ver docs/ANALISIS-Y-ARQUITECTURA.md SS10 para la metodologia completa.
 *
 * NO editar a mano salvo correcciones puntuales -- ver scripts de extraccion
 * documentados en esa misma seccion si hace falta regenerar.
 */

export interface BoxCoord {
  page: 1 | 2;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LineCoord {
  page: 1 | 2;
  x0: number;
  y0: number;
  x1: number;
}

/** Casillas de verificacion: clave -> rectangulo exacto en el PDF fuente. */
export const CHECKBOX_COORDS: Record<string, BoxCoord> = {
  "inspectionType.EXTERIOR": { page: 1, x0: 470.0, y0: 83.0, x1: 480.0, y1: 94.0 },
  "inspectionType.COMPLETA": { page: 1, x0: 540.0, y0: 83.0, x1: 550.0, y1: 94.0 },
  "inspectionTimePeriod.am": { page: 1, x0: 240.0, y0: 111.0, x1: 250.0, y1: 122.0 },
  "inspectionTimePeriod.pm": { page: 1, x0: 270.0, y0: 111.0, x1: 280.0, y1: 122.0 },
  "habitability.VERDE": { page: 1, x0: 420.0, y0: 111.0, x1: 430.0, y1: 122.0 },
  "habitability.AMARILLO": { page: 1, x0: 419, y0: 125, x1: 430, y1: 136 },
  "habitability.ROJO": { page: 1, x0: 419, y0: 138, x1: 430, y1: 149 },
  "damageLevel.NINGUNO_MENOR": { page: 1, x0: 560.0, y0: 111.0, x1: 570.0, y1: 122.0 },
  "damageLevel.MODERADO": { page: 1, x0: 560.0, y0: 125.0, x1: 570.0, y1: 136.0 },
  "damageLevel.SEVERO": { page: 1, x0: 560.0, y0: 138.0, x1: 570.0, y1: 149.0 },
  "threat.AVENIDA_TORRENCIAL": { page: 1, x0: 110.0, y0: 151.0, x1: 120.0, y1: 162.0 },
  "threat.ERUPCION_VOLCANICA": { page: 1, x0: 240.0, y0: 151.0, x1: 250.0, y1: 162.0 },
  "threat.INCENDIO_ESTRUCTURAL": { page: 1, x0: 110.0, y0: 165.0, x1: 120.0, y1: 176.0 },
  "threat.INUNDACION": { page: 1, x0: 240.0, y0: 165.0, x1: 250.0, y1: 176.0 },
  "threat.MOVIMIENTO_EN_MASA": { page: 1, x0: 110.0, y0: 179.0, x1: 120.0, y1: 190.0 },
  "threat.SISMO": { page: 1, x0: 240.0, y0: 179.0, x1: 250.0, y1: 190.0 },
  "threat.VENDAVAL": { page: 1, x0: 110.0, y0: 193.0, x1: 120.0, y1: 204.0 },
  "threat.OTRO": { page: 1, x0: 180.0, y0: 193.0, x1: 190.0, y1: 204.0 },
  "areaType.URBANO": { page: 1, x0: 490.0, y0: 193.0, x1: 500.0, y1: 204.0 },
  "areaType.RURAL": { page: 1, x0: 570.0, y0: 193.0, x1: 580.0, y1: 204.0 },
  "use.RESIDENCIAL": { page: 1, x0: 390.0, y0: 268.0, x1: 400.0, y1: 279.0 },
  "use.COMERCIAL": { page: 1, x0: 470.0, y0: 268.0, x1: 480.0, y1: 279.0 },
  "use.EDUCACIONAL": { page: 1, x0: 570.0, y0: 268.0, x1: 580.0, y1: 279.0 },
  "use.SALUD": { page: 1, x0: 390.0, y0: 282.0, x1: 400.0, y1: 293.0 },
  "use.HOTELERO": { page: 1, x0: 470.0, y0: 282.0, x1: 480.0, y1: 293.0 },
  "use.OFICINAS": { page: 1, x0: 570.0, y0: 282.0, x1: 580.0, y1: 293.0 },
  "buildingOwnership.PUBLICA": { page: 1, x0: 130.0, y0: 296.0, x1: 140.0, y1: 307.0 },
  "buildingOwnership.PRIVADA": { page: 1, x0: 200.0, y0: 296.0, x1: 210.0, y1: 307.0 },
  "use.INSTITUCIONAL": { page: 1, x0: 390.0, y0: 296.0, x1: 400.0, y1: 307.0 },
  "use.INDUSTRIAL": { page: 1, x0: 470.0, y0: 296.0, x1: 480.0, y1: 307.0 },
  "use.BODEGAS": { page: 1, x0: 570.0, y0: 296.0, x1: 580.0, y1: 307.0 },
  "use.ESTACIONAMIENTOS": { page: 1, x0: 390.0, y0: 310.0, x1: 400.0, y1: 321.0 },
  "use.OTRO": { page: 1, x0: 470.0, y0: 310.0, x1: 480.0, y1: 321.0 },
  "struct.PORTICOS": { page: 1, x0: 160.0, y0: 353.0, x1: 170.0, y1: 364.0 },
  "struct.MUROS_ESTRUCTURALES": { page: 1, x0: 280.0, y0: 353.0, x1: 290.0, y1: 364.0 },
  "struct.SISTEMA_DUAL_COMBINADO": { page: 1, x0: 420.0, y0: 353.0, x1: 430.0, y1: 364.0 },
  "struct.PREFABRICADO": { page: 1, x0: 510.0, y0: 353.0, x1: 520.0, y1: 364.0 },
  "struct.MAMPOSTERIA_CONFINADA": { page: 1, x0: 160.0, y0: 367.0, x1: 170.0, y1: 378.0 },
  "struct.MAMPOSTERIA_REFORZADA": { page: 1, x0: 280.0, y0: 367.0, x1: 290.0, y1: 378.0 },
  "struct.MAMPOSTERIA_SIMPLE": { page: 1, x0: 420.0, y0: 367.0, x1: 430.0, y1: 378.0 },
  "struct.PORTICOS_ARRIOSTRADOS": { page: 1, x0: 160.0, y0: 381.0, x1: 170.0, y1: 392.0 },
  "struct.PORTICOS_NO_ARRIOSTRADOS": { page: 1, x0: 280.0, y0: 381.0, x1: 290.0, y1: 392.0 },
  "struct.OTRO": { page: 1, x0: 360.0, y0: 381.0, x1: 370.0, y1: 392.0 },
  "struct.ESTRUCTURA_MADERA": { page: 1, x0: 160.0, y0: 395.0, x1: 170.0, y1: 406.0 },
  "struct.ESTRUCTURA_GUADUA": { page: 1, x0: 280.0, y0: 395.0, x1: 290.0, y1: 406.0 },
  "struct.MUROS_BAHAREQUE": { page: 1, x0: 160.0, y0: 409.0, x1: 170.0, y1: 420.0 },
  "struct.MUROS_TAPIA": { page: 1, x0: 280.0, y0: 409.0, x1: 290.0, y1: 420.0 },
  "struct.MIXTO": { page: 1, x0: 160.0, y0: 423.0, x1: 170.0, y1: 434.0 },
  "struct.NINGUNO": { page: 1, x0: 280.0, y0: 423.0, x1: 290.0, y1: 434.0 },
  "floor.ENTREPISO_PLACA_MACIZA": { page: 1, x0: 150.0, y0: 451.0, x1: 160.0, y1: 462.0 },
  "floor.ENTREPISO_PLACA_ALIGERADA": { page: 1, x0: 240.0, y0: 451.0, x1: 250.0, y1: 462.0 },
  "roofsup.CUBIERTA_VIGAS_CONCRETO": { page: 1, x0: 430.0, y0: 451.0, x1: 440.0, y1: 462.0 },
  "roofsup.CUBIERTA_PLACA_MACIZA_ALIGERADA": { page: 1, x0: 550.0, y0: 451.0, x1: 560.0, y1: 462.0 },
  "floor.ENTREPISO_STEELDECK": { page: 1, x0: 70.0, y0: 465.0, x1: 80.0, y1: 476.0 },
  "floor.ENTREPISO_VIGAS_CON_CONECTORES": { page: 1, x0: 150.0, y0: 465.0, x1: 160.0, y1: 476.0 },
  "floor.ENTREPISO_VIGAS_SIN_CONECTORES": { page: 1, x0: 240.0, y0: 465.0, x1: 250.0, y1: 476.0 },
  "roofsup.CUBIERTA_VIGAS_ACERO": { page: 1, x0: 430.0, y0: 465.0, x1: 440.0, y1: 476.0 },
  "roofsup.CUBIERTA_CERCHAS_ACERO": { page: 1, x0: 550.0, y0: 465.0, x1: 560.0, y1: 476.0 },
  "floor.ENTREPISO_VIGAS_MADERA": { page: 1, x0: 150.0, y0: 479.0, x1: 160.0, y1: 490.0 },
  "floor.ENTREPISO_CERCHAS_MADERA": { page: 1, x0: 240.0, y0: 479.0, x1: 250.0, y1: 490.0 },
  "roofsup.CUBIERTA_VIGAS_MADERA": { page: 1, x0: 430.0, y0: 479.0, x1: 440.0, y1: 490.0 },
  "roofsup.CUBIERTA_CERCHAS_MADERA": { page: 1, x0: 550.0, y0: 479.0, x1: 560.0, y1: 490.0 },
  "floor.ENTREPISO_MIXTO": { page: 1, x0: 70.0, y0: 493.0, x1: 80.0, y1: 504.0 },
  "floor.ENTREPISO_OTRO": { page: 1, x0: 110.0, y0: 493.0, x1: 120.0, y1: 504.0 },
  "roofsup.CUBIERTA_OTRO": { page: 1, x0: 330.0, y0: 493.0, x1: 340.0, y1: 504.0 },
  "roof.TEJA_ZINC": { page: 1, x0: 150.0, y0: 507.0, x1: 160.0, y1: 518.0 },
  "roof.TEJA_BARRO": { page: 1, x0: 230.0, y0: 507.0, x1: 240.0, y1: 518.0 },
  "roof.TEJA_FIBROCEMENTO": { page: 1, x0: 330.0, y0: 507.0, x1: 340.0, y1: 518.0 },
  "roof.TEJA_PLASTICA": { page: 1, x0: 410.0, y0: 507.0, x1: 420.0, y1: 518.0 },
  "roof.PLASTICO_PAJA": { page: 1, x0: 490.0, y0: 507.0, x1: 500.0, y1: 518.0 },
  "morph.DIVISORIA": { page: 1, x0: 70.0, y0: 557.0, x1: 80.0, y1: 568.0 },
  "morph.LADERA": { page: 1, x0: 130.0, y0: 557.0, x1: 140.0, y1: 568.0 },
  "morph.PIE_DE_LADERA": { page: 1, x0: 210.0, y0: 557.0, x1: 220.0, y1: 568.0 },
  "morph.VALLE": { page: 1, x0: 260.0, y0: 557.0, x1: 270.0, y1: 568.0 },
  "morph.BORDE_DE_RIO": { page: 1, x0: 340.0, y0: 557.0, x1: 350.0, y1: 568.0 },
  "morph.TALUD": { page: 1, x0: 400.0, y0: 557.0, x1: 410.0, y1: 568.0 },
  "morph.OTRO": { page: 1, x0: 450.0, y0: 557.0, x1: 460.0, y1: 568.0 },
  "waterBodyThreat.SI": { page: 1, x0: 190.0, y0: 570.0, x1: 200.0, y1: 581.0 },
  "waterBodyThreat.NO": { page: 1, x0: 230.0, y0: 570.0, x1: 240.0, y1: 581.0 },
  "weakStory.SI": { page: 1, x0: 110.0, y0: 598.0, x1: 120.0, y1: 609.0 },
  "weakStory.NO": { page: 1, x0: 150.0, y0: 598.0, x1: 160.0, y1: 609.0 },
  "shortColumn.SI": { page: 1, x0: 310.0, y0: 598.0, x1: 320.0, y1: 609.0 },
  "shortColumn.NO": { page: 1, x0: 350.0, y0: 598.0, x1: 360.0, y1: 609.0 },
  "stiffnessChange.SI": { page: 1, x0: 530.0, y0: 598.0, x1: 540.0, y1: 609.0 },
  "stiffnessChange.NO": { page: 1, x0: 570.0, y0: 598.0, x1: 580.0, y1: 609.0 },
  "totalCollapse.SI": { page: 1, x0: 120.0, y0: 635.0, x1: 130.0, y1: 646.0 },
  "totalCollapse.NO": { page: 1, x0: 170.0, y0: 635.0, x1: 180.0, y1: 646.0 },
  "partialCollapse.SI": { page: 1, x0: 430.0, y0: 635.0, x1: 440.0, y1: 646.0 },
  "partialCollapse.NO": { page: 1, x0: 480.0, y0: 635.0, x1: 490.0, y1: 646.0 },
  "partialCollapse.NO_ES_CLARO": { page: 1, x0: 570.0, y0: 635.0, x1: 580.0, y1: 646.0 },
  "evidentTilt.SI": { page: 1, x0: 120.0, y0: 649.0, x1: 130.0, y1: 660.0 },
  "evidentTilt.NO": { page: 1, x0: 170.0, y0: 649.0, x1: 180.0, y1: 660.0 },
  "adjacentBuildingRisk.SI": { page: 1, x0: 430.0, y0: 649.0, x1: 440.0, y1: 660.0 },
  "adjacentBuildingRisk.NO": { page: 1, x0: 480.0, y0: 649.0, x1: 490.0, y1: 660.0 },
  "adjacentBuildingRisk.NO_ES_CLARO": { page: 1, x0: 570.0, y0: 649.0, x1: 580.0, y1: 660.0 },
  "soilLiquefaction.SI": { page: 1, x0: 210.0, y0: 685.0, x1: 220.0, y1: 696.0 },
  "soilLiquefaction.NO": { page: 1, x0: 260.0, y0: 685.0, x1: 270.0, y1: 696.0 },
  "nearbyLandslides.SI": { page: 1, x0: 520.0, y0: 685.0, x1: 530.0, y1: 696.0 },
  "nearbyLandslides.NO": { page: 1, x0: 570.0, y0: 685.0, x1: 580.0, y1: 696.0 },
  "sev.COLUMNAS.NL": { page: 1, x0: 130.0, y0: 732.0, x1: 140.0, y1: 743.0 },
  "sev.COLUMNAS.M": { page: 1, x0: 150.0, y0: 732.0, x1: 160.0, y1: 743.0 },
  "sev.COLUMNAS.S": { page: 1, x0: 170.0, y0: 732.0, x1: 180.0, y1: 743.0 },
  "sev.MUROS_PORTANTES.NL": { page: 1, x0: 310.0, y0: 732.0, x1: 320.0, y1: 743.0 },
  "sev.MUROS_PORTANTES.M": { page: 1, x0: 330.0, y0: 732.0, x1: 340.0, y1: 743.0 },
  "sev.MUROS_PORTANTES.S": { page: 1, x0: 350.0, y0: 732.0, x1: 360.0, y1: 743.0 },
  "sev.VIGAS.NL": { page: 1, x0: 510.0, y0: 732.0, x1: 520.0, y1: 743.0 },
  "sev.VIGAS.M": { page: 1, x0: 530.0, y0: 732.0, x1: 540.0, y1: 743.0 },
  "sev.VIGAS.S": { page: 1, x0: 550.0, y0: 732.0, x1: 560.0, y1: 743.0 },
  "sev.NODOS_CONEXION.NL": { page: 2, x0: 130.0, y0: 64.0, x1: 140.0, y1: 75.0 },
  "sev.NODOS_CONEXION.M": { page: 2, x0: 150.0, y0: 64.0, x1: 160.0, y1: 75.0 },
  "sev.NODOS_CONEXION.S": { page: 2, x0: 170.0, y0: 64.0, x1: 180.0, y1: 75.0 },
  "sev.RIOSTRAS.NL": { page: 2, x0: 310.0, y0: 64.0, x1: 320.0, y1: 75.0 },
  "sev.RIOSTRAS.M": { page: 2, x0: 330.0, y0: 64.0, x1: 340.0, y1: 75.0 },
  "sev.RIOSTRAS.S": { page: 2, x0: 350.0, y0: 64.0, x1: 360.0, y1: 75.0 },
  "sev.ENTREPISO.NL": { page: 2, x0: 510.0, y0: 64.0, x1: 520.0, y1: 75.0 },
  "sev.ENTREPISO.M": { page: 2, x0: 530.0, y0: 64.0, x1: 540.0, y1: 75.0 },
  "sev.ENTREPISO.S": { page: 2, x0: 550.0, y0: 64.0, x1: 560.0, y1: 75.0 },
  "sev.MUROS_FACHADA_ANTEPECHOS.NL": { page: 2, x0: 140.0, y0: 122.0, x1: 150.0, y1: 133.0 },
  "sev.MUROS_FACHADA_ANTEPECHOS.M": { page: 2, x0: 160.0, y0: 122.0, x1: 170.0, y1: 133.0 },
  "sev.MUROS_FACHADA_ANTEPECHOS.S": { page: 2, x0: 180.0, y0: 122.0, x1: 190.0, y1: 133.0 },
  "sev.MUROS_DIVISORIOS.NL": { page: 2, x0: 310.0, y0: 122.0, x1: 320.0, y1: 133.0 },
  "sev.MUROS_DIVISORIOS.M": { page: 2, x0: 330.0, y0: 122.0, x1: 340.0, y1: 133.0 },
  "sev.MUROS_DIVISORIOS.S": { page: 2, x0: 350.0, y0: 122.0, x1: 360.0, y1: 133.0 },
  "sev.VENTANALES_VIDRIOS_FACHADA.NL": { page: 2, x0: 510.0, y0: 122.0, x1: 520.0, y1: 133.0 },
  "sev.VENTANALES_VIDRIOS_FACHADA.M": { page: 2, x0: 530.0, y0: 122.0, x1: 540.0, y1: 133.0 },
  "sev.VENTANALES_VIDRIOS_FACHADA.S": { page: 2, x0: 550.0, y0: 122.0, x1: 560.0, y1: 133.0 },
  "sev.CIELO_RASO_LUMINARIAS.NL": { page: 2, x0: 140.0, y0: 136.0, x1: 150.0, y1: 146.0 },
  "sev.CIELO_RASO_LUMINARIAS.M": { page: 2, x0: 160.0, y0: 136.0, x1: 170.0, y1: 146.0 },
  "sev.CIELO_RASO_LUMINARIAS.S": { page: 2, x0: 180.0, y0: 136.0, x1: 190.0, y1: 146.0 },
  "sev.CUBIERTAS.NL": { page: 2, x0: 310.0, y0: 136.0, x1: 320.0, y1: 146.0 },
  "sev.CUBIERTAS.M": { page: 2, x0: 330.0, y0: 136.0, x1: 340.0, y1: 146.0 },
  "sev.CUBIERTAS.S": { page: 2, x0: 350.0, y0: 136.0, x1: 360.0, y1: 146.0 },
  "sev.ESCALERAS.NL": { page: 2, x0: 510.0, y0: 136.0, x1: 520.0, y1: 146.0 },
  "sev.ESCALERAS.M": { page: 2, x0: 530.0, y0: 136.0, x1: 540.0, y1: 146.0 },
  "sev.ESCALERAS.S": { page: 2, x0: 550.0, y0: 136.0, x1: 560.0, y1: 146.0 },
  "sev.ASCENSORES.NL": { page: 2, x0: 140.0, y0: 149.0, x1: 150.0, y1: 159.0 },
  "sev.ASCENSORES.M": { page: 2, x0: 160.0, y0: 149.0, x1: 170.0, y1: 159.0 },
  "sev.ASCENSORES.S": { page: 2, x0: 180.0, y0: 149.0, x1: 190.0, y1: 159.0 },
  "sev.BALCONES.NL": { page: 2, x0: 310.0, y0: 149.0, x1: 320.0, y1: 159.0 },
  "sev.BALCONES.M": { page: 2, x0: 330.0, y0: 149.0, x1: 340.0, y1: 159.0 },
  "sev.BALCONES.S": { page: 2, x0: 350.0, y0: 149.0, x1: 360.0, y1: 159.0 },
  "sev.TANQUES_ELEVADOS.NL": { page: 2, x0: 510.0, y0: 149.0, x1: 520.0, y1: 159.0 },
  "sev.TANQUES_ELEVADOS.M": { page: 2, x0: 530.0, y0: 149.0, x1: 540.0, y1: 159.0 },
  "sev.TANQUES_ELEVADOS.S": { page: 2, x0: 550.0, y0: 149.0, x1: 560.0, y1: 159.0 },
  "sev.INSTALACIONES_GAS.NL": { page: 2, x0: 140.0, y0: 162.0, x1: 150.0, y1: 173.0 },
  "sev.INSTALACIONES_GAS.M": { page: 2, x0: 160.0, y0: 162.0, x1: 170.0, y1: 173.0 },
  "sev.INSTALACIONES_GAS.S": { page: 2, x0: 180.0, y0: 162.0, x1: 190.0, y1: 173.0 },
  "sev.INSTALACIONES_ELECTRICAS.NL": { page: 2, x0: 310.0, y0: 162.0, x1: 320.0, y1: 173.0 },
  "sev.INSTALACIONES_ELECTRICAS.M": { page: 2, x0: 330.0, y0: 162.0, x1: 340.0, y1: 173.0 },
  "sev.INSTALACIONES_ELECTRICAS.S": { page: 2, x0: 350.0, y0: 162.0, x1: 360.0, y1: 173.0 },
  "sev.ACUEDUCTO_ALCANTARILLADO.NL": { page: 2, x0: 510.0, y0: 162.0, x1: 520.0, y1: 173.0 },
  "sev.ACUEDUCTO_ALCANTARILLADO.M": { page: 2, x0: 530.0, y0: 162.0, x1: 540.0, y1: 173.0 },
  "sev.ACUEDUCTO_ALCANTARILLADO.S": { page: 2, x0: 550.0, y0: 162.0, x1: 560.0, y1: 173.0 },
  "sev.OTROS.NL": { page: 2, x0: 310.0, y0: 176.0, x1: 320.0, y1: 187.0 },
  "sev.OTROS.M": { page: 2, x0: 330.0, y0: 176.0, x1: 340.0, y1: 187.0 },
  "sev.OTROS.S": { page: 2, x0: 350.0, y0: 176.0, x1: 360.0, y1: 187.0 },
  "habitability2.VERDE": { page: 2, x0: 109, y0: 393, x1: 140, y1: 404 },
  "habitability2.AMARILLO": { page: 2, x0: 309, y0: 393, x1: 340, y1: 404 },
  "habitability2.ROJO": { page: 2, x0: 549, y0: 393, x1: 580, y1: 404 },
  "damageLevel2.NINGUNO_MENOR": { page: 2, x0: 190.0, y0: 406.0, x1: 200.0, y1: 416.0 },
  "damageLevel2.MODERADO": { page: 2, x0: 280.0, y0: 406.0, x1: 290.0, y1: 416.0 },
  "damageLevel2.SEVERO": { page: 2, x0: 480.0, y0: 406.0, x1: 490.0, y1: 416.0 },
  "previousEvaluationExists.SI": { page: 2, x0: 160.0, y0: 418.0, x1: 170.0, y1: 429.0 },
  "previousEvaluationExists.NO": { page: 2, x0: 210.0, y0: 418.0, x1: 220.0, y1: 429.0 },
  "occupationStatus.OCUPADA": { page: 2, x0: 200.0, y0: 470.0, x1: 210.0, y1: 481.0 },
  "occupationStatus.DESOCUPADA": { page: 2, x0: 340.0, y0: 470.0, x1: 350.0, y1: 481.0 },
  "reco.EVAL_ADICIONAL_ESTRUCTURAL": { page: 2, x0: 170.0, y0: 508.0, x1: 180.0, y1: 519.0 },
  "reco.EVAL_ADICIONAL_GEOTECNICA": { page: 2, x0: 270.0, y0: 508.0, x1: 280.0, y1: 519.0 },
  "reco.EVAL_ADICIONAL_EMPRESA_SERVICIOS": { page: 2, x0: 480.0, y0: 508.0, x1: 490.0, y1: 519.0 },
  "reco.EVACUAR_EDIFICACION": { page: 2, x0: 100.0, y0: 521.0, x1: 110.0, y1: 532.0 },
  "reco.EVACUAR_EDIFICACIONES_ALEDANAS": { page: 2, x0: 270.0, y0: 521.0, x1: 280.0, y1: 532.0 },
  "reco.DESCONECTAR_ENERGIA": { page: 2, x0: 450.0, y0: 521.0, x1: 460.0, y1: 532.0 },
  "reco.DESCONECTAR_AGUA": { page: 2, x0: 510.0, y0: 521.0, x1: 520.0, y1: 532.0 },
  "reco.DESCONECTAR_GAS": { page: 2, x0: 560.0, y0: 521.0, x1: 570.0, y1: 532.0 },
  "reco.APUNTALAR": { page: 2, x0: 100.0, y0: 534.0, x1: 110.0, y1: 545.0 },
  "reco.DEMOLER_ELEMENTOS_PELIGRO": { page: 2, x0: 270.0, y0: 534.0, x1: 280.0, y1: 545.0 },
  "reco.RESTRINGIR_PASO_PEATONAL": { page: 2, x0: 450.0, y0: 534.0, x1: 460.0, y1: 545.0 },
  "reco.RESTRINGIR_PASO_VEHICULAR": { page: 2, x0: 510.0, y0: 534.0, x1: 520.0, y1: 545.0 },
  "reco.ESTABILIZAR_TALUDES": { page: 2, x0: 100.0, y0: 548.0, x1: 110.0, y1: 559.0 },
  "reco.DRENAR_AGUA": { page: 2, x0: 270.0, y0: 548.0, x1: 280.0, y1: 559.0 },
  "reco.LIMPIAR_MATERIAL_CUBIERTA": { page: 2, x0: 470.0, y0: 548.0, x1: 480.0, y1: 559.0 },
  "reco.CAMBIAR_TEJA_CUBIERTA": { page: 2, x0: 150.0, y0: 562.0, x1: 160.0, y1: 573.0 },
  "reco.OTRO": { page: 2, x0: 340.0, y0: 562.0, x1: 350.0, y1: 573.0 },
  "evaluatorDocType.CC": { page: 2, x0: 120.0, y0: 677.0, x1: 130.0, y1: 688.0 },
  "evaluatorDocType.PASAPORTE": { page: 2, x0: 180.0, y0: 677.0, x1: 190.0, y1: 688.0 },
};

/** Campos de texto (lineas subrayadas): clave -> posicion + ancho disponible. */
export const BLANK_COORDS: Record<string, LineCoord> = {
  "formNumber": { page: 1, x0: 89, y0: 93, x1: 180 },
  "zoneId": { page: 1, x0: 229, y0: 93, x1: 290 },
  "evaluatorName": { page: 1, x0: 109, y0: 107, x1: 290 },
  "inspectionDate": { page: 1, x0: 99, y0: 121, x1: 160 },
  "inspectionTime": { page: 1, x0: 199, y0: 121, x1: 230 },
  "groupId": { page: 1, x0: 59, y0: 135, x1: 160 },
  "entity": { page: 1, x0: 209, y0: 135, x1: 299 },
  "department": { page: 1, x0: 369, y0: 189, x1: 440 },
  "municipality": { page: 1, x0: 489, y0: 189, x1: 580 },
  "threatOtherText": { page: 1, x0: 239, y0: 203, x1: 290 },
  "neighborhood": { page: 1, x0: 369, y0: 203, x1: 440 },
  "contactPerson": { page: 1, x0: 99, y0: 217, x1: 290 },
  "longitude": { page: 1, x0: 389, y0: 217, x1: 440 },
  "latitude": { page: 1, x0: 519, y0: 217, x1: 580 },
  "contactPhone": { page: 1, x0: 99, y0: 231, x1: 290 },
  "address": { page: 1, x0: 59, y0: 264, x1: 290 },
  "buildingName": { page: 1, x0: 119, y0: 278, x1: 290 },
  "floorsAboveGround": { page: 1, x0: 149, y0: 292, x1: 180 },
  "basements": { page: 1, x0: 259, y0: 292, x1: 290 },
  "frontDimension": { page: 1, x0: 169, y0: 320, x1: 200 },
  "depthDimension": { page: 1, x0: 259, y0: 320, x1: 290 },
  "useOtherText": { page: 1, x0: 519, y0: 320, x1: 580 },
  "structuralSystemOtherText": { page: 1, x0: 409, y0: 391, x1: 460 },
  "floorSystemOtherText": { page: 1, x0: 159, y0: 503, x1: 250 },
  "roofSupportOtherText": { page: 1, x0: 379, y0: 503, x1: 440 },
  "siteMorphologyOtherText": { page: 1, x0: 499, y0: 567, x1: 580 },
  "waterBodyDistance": { page: 1, x0: 329, y0: 580, x1: 370 },
  "waterBodyNotes": { page: 1, x0: 449, y0: 580, x1: 580 },
  "nonStructOtherText": { page: 2, x0: 89, y0: 186, x1: 210 },
  "previousEvaluationType": { page: 2, x0: 319, y0: 428, x1: 420 },
  "previousEvaluationEntity": { page: 2, x0: 489, y0: 428, x1: 580 },
  "previousEvaluationHabitability": { page: 2, x0: 239, y0: 442, x1: 420 },
  "previousEvaluationDate": { page: 2, x0: 489, y0: 442, x1: 580 },
  "recoOtherText": { page: 2, x0: 399, y0: 572, x1: 520 },
  "evaluatorName2": { page: 2, x0: 59, y0: 674, x1: 280 },
  "evaluatorIdCode": { page: 2, x0: 479, y0: 674, x1: 580 },
  "evaluatorDocNumber": { page: 2, x0: 289, y0: 687, x1: 380 },
  "evaluatorEntity": { page: 2, x0: 479, y0: 687, x1: 580 },
  "evaluatorDependencia": { page: 2, x0: 79, y0: 701, x1: 190 },
  "evaluatorSignatureLine": { page: 2, x0: 229, y0: 701, x1: 380 },
  "responsibleOfficialSignatureLine": { page: 2, x0: 429, y0: 701, x1: 580 },
  "responsibleOfficialCc": { page: 2, x0: 469, y0: 721, x1: 580 },
  "responsibleOfficialEntity": { page: 2, x0: 469, y0: 731, x1: 580 },
};

/**
 * Recuadros para incrustar la IMAGEN de una firma capturada con el dedo
 * (ver public/inspection.html) -- a diferencia de BLANK_COORDS (texto
 * escrito por la app), acá se dibuja el trazo real.
 *
 * `inspectorSignatureImage` reutiliza el espacio de la línea "Firma:" ya
 * impresa en el formulario (mismo rango x que `evaluatorSignatureLine`).
 * `occupantSignatureImage` NO tiene línea impresa correspondiente en el
 * formulario original -- el propietario/ocupante de la vivienda no forma
 * parte del formulario fuente, solo el evaluador y un "funcionario
 * responsable" -- así que ocupa un espacio en blanco real dentro del
 * recuadro de la sección 16 (columna izquierda, debajo de la línea de firma
 * del evaluador; se aparta a propósito de ser una réplica exacta a pedido
 * explícito, con una etiqueta agregada por la app para que quede claro que
 * no es texto impreso del original).
 *
 * Misma ALTURA en las dos (27pt) a pedido explícito del usuario -- de lo
 * contrario, `drawSignatureImage`/`fillSignature` escalan la firma para que
 * quepa completa dentro de su recuadro preservando proporción, y con la
 * altura original de `inspectorSignatureImage` (14pt, para no invadir la
 * fila de arriba) la firma del evaluador salía visiblemente más chica que
 * la del propietario/ocupante. Para lograr la misma altura, el recuadro del
 * evaluador ahora sí invade la fila de "Número de documento" que está justo
 * encima -- aceptado a propósito ("sin importar que se remonte en el texto
 * del documento").
 */
export const SIGNATURE_COORDS: Record<string, BoxCoord> = {
  "inspectorSignatureImage": { page: 2, x0: 229, y0: 673, x1: 378, y1: 700 },
  "occupantSignatureImage": { page: 2, x0: 150, y0: 709, x1: 376, y1: 736 },
};
