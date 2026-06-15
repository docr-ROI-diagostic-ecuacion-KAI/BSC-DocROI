# Doc ROI Analytics

Repositorio central para el cuadro de mando Doc ROI: analytics del Botiquin, CRM de Executive, tracking por keywords estrategicas, UTMs y preparacion para Power BI.

## Objetivo

Unificar en una sola solucion:

- medicion de audiencia del Botiquin
- clicks por keyword estrategica
- campanas UTM
- leads de Executive
- funnel CRM
- dashboard responsive privado

## URLs de negocio

- Botiquin: https://el-botiquin-del-doc-roi.vercel.app/
- Executive: https://doc-roi-executive.vercel.app/

## Estructura prevista

- `public/index.html`: dashboard responsive
- `public/tracker.js`: script de tracking para Botiquin y Executive
- `api/collect.js`: endpoint para eventos de navegacion
- `api/lead.js`: endpoint para leads CRM
- `INTEGRACION.md`: instrucciones para integrar en las dos webs

## Estado

MVP inicial preparado para desplegar en Vercel.
