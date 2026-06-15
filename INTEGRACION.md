# Integracion Doc ROI Analytics

## Publicacion

Conectar este repositorio a Vercel y desplegarlo como aplicacion independiente, por ejemplo `docroi-analytics.vercel.app`.

## Variables Vercel

```text
DOCROI_ANALYTICS_WEBHOOK_URL=
DOCROI_ANALYTICS_WEBHOOK_SECRET=
DOCROI_CRM_WEBHOOK_URL=
DOCROI_CRM_WEBHOOK_SECRET=
```

Sin webhook, la API acepta datos pero no los persiste. Para produccion, conectar Power Automate/OneDrive Excel o Supabase/Postgres.

## Botiquin

Insertar antes de `</body>`:

```html
<script>
  window.DocROIAnalytics = {
    sourceSite: "Botiquin",
    endpoint: "https://TU-DOMINIO-ANALYTICS.vercel.app/api/collect"
  };
</script>
<script src="https://TU-DOMINIO-ANALYTICS.vercel.app/tracker.js" defer></script>
```

Etiquetar enlaces clave:

```html
<a href="https://doc-roi-executive.vercel.app/" data-analytics-link-id="LNK_EXECUTIVE_001" data-analytics-keyword="Executive" data-analytics-area="conversion">Abrir Doc ROI Executive</a>
```

Keywords iniciales: Pildora, Vitamina, Medicina, Ecuacion KAI, Botiquin, Diagnostico, Executive, Formacion, Incompany.

## Executive

Insertar el mismo tracker cambiando `sourceSite` a `Executive`.

Enviar formularios de lead por POST a:

```text
https://TU-DOMINIO-ANALYTICS.vercel.app/api/lead
```

Payload recomendado:

```json
{
  "source_site": "Executive",
  "business_model_id": "BM_INCOMPANY",
  "stage_id": "COLD",
  "urgency_id": "HIGH",
  "contact_name": "Nombre",
  "company": "Empresa",
  "email": "email@dominio.com",
  "phone": "",
  "role": "Director de formacion",
  "need_summary": "Necesita diagnostico IA",
  "next_action": "Responder y cualificar",
  "consent": "Si"
}
```
