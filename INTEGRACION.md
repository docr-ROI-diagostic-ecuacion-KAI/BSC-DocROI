# Integracion Doc ROI Analytics

## URL activa

Dashboard y API central:

```text
https://bsc-doc-roi-61qn.vercel.app/
```

Endpoint de eventos:

```text
https://bsc-doc-roi-61qn.vercel.app/api/collect
```

Endpoint de leads:

```text
https://bsc-doc-roi-61qn.vercel.app/api/lead
```

## Variables Vercel

```text
DOCROI_ANALYTICS_WEBHOOK_URL=
DOCROI_ANALYTICS_WEBHOOK_SECRET=
DOCROI_CRM_WEBHOOK_URL=
DOCROI_CRM_WEBHOOK_SECRET=
```

Sin webhook, la API acepta datos pero no los persiste. Para produccion, conectar Power Automate/OneDrive Excel o Supabase/Postgres.

## Botiquin

Snippet esperado antes de `</body>`:

```html
<script>
  window.DocROIAnalytics = {
    sourceSite: "Botiquin",
    endpoint: "https://bsc-doc-roi-61qn.vercel.app/api/collect"
  };
</script>
<script src="./docroi-botiquin-analytics.js" defer></script>
<script src="https://bsc-doc-roi-61qn.vercel.app/tracker.js" defer></script>
```

El repo del Botiquin ya incluye un workflow para inyectarlo automaticamente.

## Executive

Snippet esperado antes de `</body>`:

```html
<script>
  window.DocROIAnalyticsBaseUrl = "https://bsc-doc-roi-61qn.vercel.app";
  window.DocROIAnalytics = {
    sourceSite: "Executive",
    endpoint: "https://bsc-doc-roi-61qn.vercel.app/api/collect"
  };
</script>
<script src="https://bsc-doc-roi-61qn.vercel.app/tracker.js" defer></script>
<script src="./docroi-executive-analytics.js" defer></script>
```

El repo de Executive ya incluye un workflow para inyectarlo automaticamente y enviar formularios a `/api/lead`.

## Keywords iniciales

- Pildora
- Vitamina
- Medicina
- Ecuacion KAI
- Botiquin
- Diagnostico
- Executive
- Formacion
- Incompany
