# Checklist — CRM Salón de Belleza (Eva - Cagua)

## Contexto
- **Clienta:** Eva, dueña de salón de belleza en Cagua
- **Servicios:** Manicurista, Lashista, Alisado
- **Retos:** Digitalizar agenda, registro de ingresos, nómina automatizada, estructura de costos
- **Precio acordado:** $400 c/u (Waiha y Jesus), cobrar mitad adelantada
- **Timeline:** Demo martes, 3-4 semanas dev + 2-3 semanas prueba = ~2 meses total

---

## Módulos a Desarrollar

### 1. Agenda / Citas
- [ ] Solo RECEPCIÓN puede agendar (una sola persona)
- [ ] Trabajadoras ven SOLO su agenda del día (fecha, hora, servicio, nombre cliente, monto)
- [ ] Trabajadoras NO ven comisiones ni detalles financieros
- [ ] Flujo: cliente escribe → recepción agenda → trabajadora ve su cita
- [ ] NO auto-agendado por clientes (Eva no quiere)

### 2. Ingresos / Caja
- [ ] Registro de ingresos por servicio
- [ ] Pago con pago móvil (convertir a tasa del día BCV/USDT)
- [ ] Flujo de caja dividido automáticamente
- [ ] Cierre de caja diario/semanal

### 3. Comisiones / Nómina
- [ ] Sistema de comisiones por trabajadora (30%, 60%, 70% dependiendo)
- [ ] Nómina automatizada al final de semana
- [ ] Cálculo automático: quién hizo qué servicio → cuánto le corresponde
- [ ] Transparencia: admin ve todo, trabajadoras solo ven lo suyo

### 4. Costeo / Estructura de Costos
- [ ] Botón "Ingresar servicio"
- [ ] Agregar insumos por servicio (producto, costo por kg/gramo, cantidad por servicio)
- [ ] Vinculado al inventario (descuenta automáticamente)
- [ ] Calcular: mano de obra + materia prima = costo total
- [ ] Mostrar ganancia en VERDE (ej: "Ganancia: 20%")
- [ ] Alerta si el costo se sale de control (materia prima sube)
- [ ] Servicios: ~8-10 máximo (uñas, pestañas egipcias/francesas, alisado, etc.)

### 5. Clientes
- [ ] Ficha de clientes con fotos
- [ ] Historial de servicios por cliente
- [ ] Módulo sencillo (ya creado en AstroBarber, adaptar)

### 6. Inventario
- [ ] Módulo sencillo de control de stock
- [ ] Productos vinculados al costeo
- [ ] Alertas de stock bajo

### 7. Reportes
- [ ] Mejor cliente (quién produce más)
- [ ] Métricas de trabajadoras
- [ ] Ingresos por período
- [ ] Ranking de servicios más solicitados

### 8. Administración
- [ ] Usuario Admin (Eva) — ve todo
- [ ] Usuario Caja/Recepción — agenda, cobra, ve flujo
- [ ] Usuarios Trabajadoras — solo ven su agenda del día

---

## Diseño / Branding
- [ ] Estética femenina, elegante (inspiración Victoria's Secret)
- [ ] Colores: rosado + variaciones moradas
- [ ] Tiene que quedar BONITO (son mujeres, importa la apariencia)
- [ ] Instagram de Eva para referencia de estilo
- [ ] Demo pulida para presentar el martes

---

## Tareas Comerciales
- [ ] Preparar demo para el MARTES
- [ ] Reunión con Eva el martes en Cagua
- [ ] Presentar propuesta económica en la reunión
- [ ] No dar precio antes de la demo (dejar que imaginen el precio)
- [ ] Decir: "Es un trabajo de más de 3 cifras (+$1,000)" pero ajustar a realidad venezolana
- [ ] Cobrar 50% adelantado, resto en 2 partes durante el proyecto
- [ ] Pitch: "Modernización digital para empresas venezolanas"

---

## Clientes Futuros (en pipeline)
- [ ] **Aurora** — tienda de ropa (amiga de Eva, también quiere sistema)
  - Propuesta ya hecha por Jesus
  - Misma demo adaptada
  - Precio: $300 c/u si son dos (descuento por volumen)
  - Marca de ropa, trabajan con Fina (que es basura)

---

## Notas Técnicas
- Usar base de JanaStudio (CRM ya existente) como base
- Simplificar: "la mitad de Astro pero poderoso"
- NO complejizar la agenda (el error de antes fue por base de datos)
- Módulo de producción liviano
- Evitar que el sistema se trabe o dé errores por muchos módulos
- Priorizar flujo eficiente y centralizado

---

## Acuerdos entre Waiha y Jesus
- [ ] Jesus maneja parte comercial (ventas, clientes, reuniones)
- [ ] Waiha maneja desarrollo técnico
- [ ] Jesus escribe especificaciones (no en código, en texto/audio)
- [ ] Waiha audita lo que Jesus desarrolla
- [ ] Proyecto de Aurora en stand by (priorizar flujo de Eva)
- [ ] Comprar mejor laptop con las ganancias
