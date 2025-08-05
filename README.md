# LetraSync Karaokê PWA v22

Esta versão inclui o suporte ao modelo EN otimizado (vosk-model-en) e está preparada para receber o modelo PT-BR no futuro.

## Estrutura
- `index.html`: Página principal PWA
- `app.js`: Lógica principal (sincronização, controle, QR code, Vosk)
- `vosk-model-en/`: Modelo EN otimizado (adicione o modelo aqui)
- `vosk-model-pt/`: Pasta vazia (para adicionar modelo PT-BR no futuro)
- `manifest.json` e `sw.js`: Configurações PWA
- Ícones: `icon-192.png` e `icon-512.png`

## Alterar Modelo
No arquivo `app.js`, altere:
```javascript
const currentModel = "vosk-model-en";
// Para PT-BR no futuro:
// const currentModel = "vosk-model-pt";
```

## Futuro
Na versão v23+ será implementada detecção automática de idioma para alternar entre EN/PT.
