# Nexus - Sistema de Voz y Compliance

## Novedades

### 1. Sistema de Voz (Speech-to-Text)
- **Componente VoiceInput**: Reconocimiento de voz usando Web Speech API
- **Integrado en modal de agentes**: Dicta system prompts por voz
- **Soporte multi-idioma**: Español, inglés, y más
- **Indicadores visuales**: Animación mientras escucha

### 2. Sistema de Respuesta de Voz (Text-to-Speech)
- **Componente VoiceOutput**: Síntesis de voz para respuestas
- **Integración automática**: Reproduce respuestas del agente
- **Configuración de voz**: Selección de idioma y velocidad

### 3. Asistente de Voz Integrado
- **Componente VoiceAssistant**: Interfaz completa de voz
- **Comandos rápidos**: Botones pre-configurados para comandos comunes
- **Estado visual**: Indicadores de escucha, procesamiento y respuesta
- **Integración con agentes**: Compatible con el sistema de agentes de nexus

### 4. Plugin KAIBARIX Compliance
- **4 herramientas de compliance**:
  - `kaibarix_get_regulations`: Obtener regulaciones por industria
  - `kaibarix_check_compliance`: Verificar estado de compliance
  - `kaibarix_generate_report`: Generar reportes de compliance
  - `kaibarix_log_audit`: Registrar eventos de auditoría
- **20 industrias soportadas**: Healthcare, Financial Services, Tax Preparation, etc.
- **30+ regulaciones**: FDA 21 CFR Part 11, HIPAA, GDPR, IRS Circular 230, etc.

### 5. Agente de Compliance por Voz
- **Pre-configurado**: Agente especializado en compliance
- **Conectado a KAIBARIX**: Usa el plugin de compliance
- **Prompt optimizado**: Instrucciones específicas para compliance
- **Usable por voz**: Dicta comandos de compliance directamente

## Uso del Sistema de Voz

### Configuración Inicial
1. Asegúrate de estar usando Chrome o Edge (Web Speech API)
2. Inicia el backend de KAIBARIX en puerto 3001
3. Ejecuta el seed de nexus para crear el agente de compliance

### Dictar Tareas
1. Ve a la página de agentes
2. Crea un nuevo agente o usa el "Agente de Compliance por Voz"
3. Usa el botón "🎤 Dictar tarea" para dictar comandos
4. El sistema transcribirá tu voz a texto automáticamente

### Comandos de Voz Ejemplo
- "¿Qué regulaciones aplica a healthcare?"
- "Verificar compliance HIPAA"
- "Generar reporte de compliance mensual"
- "Registrar auditoría de acceso"

## Arquitectura

```
Nexus Web App
├── VoiceInput (Speech-to-Text)
│   └── Web Speech API
├── VoiceOutput (Text-to-Speech)
│   └── Web Speech API
├── VoiceAssistant (Interfaz completa)
│   ├── VoiceInput
│   └── VoiceOutput
└── Agent System
    └── KAIBARIX Compliance Plugin
        └── KAIBARIX Backend (Port 3001)
```

## Compatibilidad

### Navegadores
- ✅ Chrome/Edge (recomendado)
- ⚠️ Safari (soporte parcial)
- ❌ Firefox (no soporta Web Speech API)

### Dispositivos
- ✅ Desktop
- ✅ Tablet
- ⚠️ Mobile (requiere permisos de micrófono)

## Próximas Mejoras

- [ ] Soporte para más idiomas
- [ ] Comandos de voz personalizados
- [ ] Historial de comandos de voz
- [ ] Atajos de teclado para activar voz
- [ ] Integración con más plugins de compliance
- [ ] Reportes de compliance por voz
- [ ] Configuración de velocidad de voz
- [ ] Selección de voces diferentes

## Troubleshooting

### El reconocimiento de voz no funciona
- Verifica que estés usando Chrome o Edge
- Asegúrate de haber dado permisos de micrófono
- Revisa que el backend de KAIBARIX esté corriendo

### La síntesis de voz no funciona
- Verifica que el navegador soporte Text-to-Speech
- Asegúrate de que el volumen esté activado
- Revisa la consola para errores

### El plugin de KAIBARIX no responde
- Verifica que el backend de KAIBARIX esté en puerto 3001
- Revisa la configuración del plugin (API URL)
- Verifica que las credenciales sean correctas
