# 🚀 GUÍA COMPLETA: Despliegue en Vercel + Monetización con AdSense

## 📦 ESTRUCTURA DE ARCHIVOS

```
novusance-finance/
├── index.html              ← Tu calculadora (LISTO ✓)
├── vercel.json            ← Configuración Vercel (LISTO ✓)
├── public/
│   ├── Novusance-Logo.png
│   ├── grafico-de-crecimiento.png
│   ├── invesment.png
│   └── tablero-de-dardos.png
└── README.md              ← Esta guía
```

---

## 🎯 PASO 1: PREPARAR GITHUB (5 minutos)

1. **Crear cuenta en GitHub** (si no tienes):
   - Ve a https://github.com
   - Click en "Sign up"
   - Completa el registro

2. **Crear nuevo repositorio**:
   - Click en el botón verde "New repository"
   - Nombre: `novusance-finance`
   - Descripción: "Calculadora de Interés Compuesto - Novusance Finance"
   - Público (para usar Vercel gratis)
   - NO marcar "Initialize with README"
   - Click en "Create repository"

3. **Subir archivos**:
   - En tu computadora, abre la terminal/CMD
   - Navega a tu carpeta del proyecto
   - Ejecuta estos comandos:

```bash
git init
git add .
git commit -m "Initial commit - Novusance Finance"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/novusance-finance.git
git push -u origin main
```

**IMPORTANTE**: Reemplaza `TU_USUARIO` con tu nombre de usuario de GitHub.

---

## 🚀 PASO 2: DESPLEGAR EN VERCEL (3 minutos)

1. **Crear cuenta en Vercel**:
   - Ve a https://vercel.com
   - Click en "Sign Up"
   - Elige "Continue with GitHub"
   - Autoriza a Vercel

2. **Importar proyecto**:
   - Click en "Add New..." → "Project"
   - Busca `novusance-finance` en la lista
   - Click en "Import"

3. **Configurar deployment**:
   - **Project Name**: novusance-finance (o el que quieras)
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - Click en "Deploy"

4. **¡Listo!**
   - Espera 30-60 segundos
   - Tu sitio estará en: `https://novusance-finance.vercel.app`
   - Puedes agregar dominio personalizado después

---

## 💰 PASO 3: APLICAR A GOOGLE ADSENSE (Requisitos previos)

### ⚠️ REQUISITOS IMPORTANTES:

**Antes de aplicar, tu sitio DEBE tener**:
1. ✅ Contenido original y de calidad (TIENES ✓)
2. ✅ Al menos 20-30 visitas diarias durante 2-4 semanas
3. ✅ Cumplir políticas de Google AdSense
4. ✅ Dominio propio (opcional pero recomendado)

### 📋 PASOS PARA APLICAR:

1. **Ve a Google AdSense**:
   - https://www.google.com/adsense
   - Click en "Empezar"
   - Inicia sesión con tu cuenta de Google

2. **Completa la aplicación**:
   - URL del sitio: `https://novusance-finance.vercel.app` (o tu dominio)
   - Selecciona tu país: España
   - Acepta términos y condiciones
   - Click en "Crear cuenta"

3. **Conecta tu sitio**:
   - AdSense te dará un código similar a:
   ```html
   <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-1234567890123456"
        crossorigin="anonymous"></script>
   ```

4. **Añade el código a tu sitio**:
   - Abre `index.html`
   - Busca la línea que dice: `<!-- PASO 1: Descomenta esta línea...`
   - Reemplaza XXXXXXXXXXXXXXXX con tu ID de publisher
   - Descomenta la línea (quita `<!--` y `-->`)
   - Guarda y sube a GitHub:
   ```bash
   git add index.html
   git commit -m "Add AdSense verification code"
   git push
   ```
   - Vercel desplegará automáticamente en ~30 segundos

5. **Verifica tu sitio**:
   - Vuelve a AdSense
   - Click en "Solicitar revisión"
   - Espera 1-2 semanas para aprobación

---

## 📊 PASO 4: AÑADIR ANUNCIOS (Después de aprobación)

Cuando AdSense te apruebe:

1. **Crea unidades de anuncios** en AdSense:
   - Panel → Anuncios → Por unidad de anuncio
   - Crea 2 anuncios:
     - Anuncio 1: Display responsive (lateral)
     - Anuncio 2: Display horizontal (footer)

2. **Copia los códigos de anuncios**

3. **Añádelos a index.html**:
   - Busca `<!-- PASO 2: Cuando AdSense te apruebe...`
   - Reemplaza con tu código de anuncio lateral
   - Busca `<!-- PASO 3: Cuando AdSense te apruebe...`
   - Reemplaza con tu código de anuncio footer
   - Guarda y sube:
   ```bash
   git add index.html
   git commit -m "Add AdSense ad units"
   git push
   ```

---

## 💡 TIPS PARA AUMENTAR TRÁFICO (IMPORTANTE)

Para monetizar, necesitas tráfico:

### SEO Básico:
1. ✅ Ya tienes meta descriptions
2. ✅ Ya tienes keywords
3. Registra tu sitio en Google Search Console
4. Crea contenido de blog sobre finanzas e inversión

### Redes Sociales:
1. Comparte en LinkedIn, Twitter, Instagram
2. Crea infografías sobre interés compuesto
3. Videos cortos explicando la calculadora (TikTok, Reels)

### Marketing de Contenido:
1. Escribe artículos sobre:
   - "Cómo el interés compuesto te hace rico"
   - "Calculadora de inversión gratuita"
   - "Planifica tu retiro con interés compuesto"
2. Publica en Medium, LinkedIn Articles

---

## 💰 ALTERNATIVAS A ADSENSE

Si AdSense te rechaza o quieres diversificar:

1. **Media.net** - Alternativa #1 a AdSense
2. **PropellerAds** - Acepta sitios nuevos
3. **Ezoic** - Requiere 10,000 visitas/mes
4. **Programa de afiliados**:
   - Brokers de inversión
   - Plataformas de ahorro
   - Cursos de finanzas

---

## 🔧 MANTENIMIENTO Y ACTUALIZACIONES

Para actualizar tu sitio:

```bash
# 1. Haz cambios en tus archivos
# 2. Guarda
# 3. Sube a GitHub:
git add .
git commit -m "Descripción de cambios"
git push

# 4. Vercel despliega automáticamente en ~30 segundos
```

---

## 📈 MONITOREO DE RENDIMIENTO

### Google Analytics (Gratis):
1. Crea cuenta en https://analytics.google.com
2. Añade el código de seguimiento a tu index.html
3. Monitorea visitas, bounce rate, tiempo en página

### Google Search Console (Gratis):
1. Registra tu sitio en https://search.google.com/search-console
2. Verifica propiedad
3. Monitorea posiciones en búsqueda, errores, indexación

---

## 🎯 CHECKLIST DE LANZAMIENTO

ANTES DE APLICAR A ADSENSE:
- [ ] Sitio desplegado en Vercel
- [ ] Todas las imágenes funcionan
- [ ] Calculadora funciona correctamente
- [ ] Sitio responsive (móvil y desktop)
- [ ] Al menos 2-4 semanas de tráfico constante
- [ ] Contenido adicional (blog posts recomendado)

DESPUÉS DE APROBACIÓN ADSENSE:
- [ ] Código de AdSense añadido al <head>
- [ ] Anuncio lateral añadido
- [ ] Anuncio footer añadido
- [ ] Verificar que anuncios se muestran
- [ ] Monitorear métricas en AdSense

---

## 🆘 SOLUCIÓN DE PROBLEMAS

**Problema**: Vercel no despliega
- Solución: Revisa que vercel.json esté en la raíz

**Problema**: Imágenes no cargan
- Solución: Verifica que la carpeta `public/` esté en la raíz

**Problema**: AdSense rechaza solicitud
- Solución: Espera 6 meses, aumenta tráfico, añade más contenido

---

## 📞 RECURSOS ÚTILES

- **Vercel Docs**: https://vercel.com/docs
- **AdSense Help**: https://support.google.com/adsense
- **GitHub Docs**: https://docs.github.com
- **SEO Guide**: https://moz.com/beginners-guide-to-seo

---

## 🎉 ¡ÉXITO!

Tu sitio está listo para generar ingresos pasivos. 
Recuerda: La clave es el TRÁFICO. Enfócate en:
1. SEO
2. Contenido de calidad
3. Promoción en redes sociales
4. Paciencia (los primeros $100 pueden tardar meses)

---

**Creado con ❤️ para Novusance Finance**
