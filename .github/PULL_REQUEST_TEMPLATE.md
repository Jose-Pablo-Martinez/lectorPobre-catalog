## Descripción del cambio

<!-- Explica brevemente qué cambia y por qué es necesario -->

## Requisito(s) relacionado(s)

<!-- Referencia el RF o RNF del ERS que se implementa o corrige. Ejemplo: RF-07, RNF-04 -->

- RF/RNF: 

## Tipo de cambio

- [ ] Nueva funcionalidad
- [ ] Corrección de bug
- [ ] Refactoring (sin cambio funcional)
- [ ] Documentación
- [ ] Configuración / infraestructura

## Checklist

- [ ] El código compila y los tests pasan localmente (`go test ./...` y `npm run test`)
- [ ] Se agregó GoDoc o JSDoc a todas las funciones y tipos públicos nuevos
- [ ] Se referencia el RF/RNF correspondiente en los comentarios del código
- [ ] No se introdujeron secretos, tokens ni credenciales en el código fuente
- [ ] CORS está correctamente configurado en los handlers Go nuevos
- [ ] Los mensajes de error expuestos al cliente son genéricos (sin detalles internos)
- [ ] El checklist completo de `docs/DEVELOPMENT_GUIDELINES.md` fue verificado

## Capturas / evidencia (opcional)

<!-- Agrega capturas de pantalla, resultados de tests o cualquier evidencia relevante -->
