# LetraSync Karaokê PWA v22-mic

Esta versão inclui botão de microfone para iPhone e indicador de volume de áudio.

## Estrutura
- `index.html`: Página principal PWA
- `app.js`: Lógica principal (sincronização, QR code, Vosk, microfone)
- `vosk-model-en/`: Adicione aqui o conteúdo do modelo EN small
- `vosk-model-pt/`: Pasta vazia (para modelo PT-BR no futuro)
- `manifest.json` e `sw.js`: Configurações PWA
- Ícones: `icon-192.png` e `icon-512.png`

## Alterar Modelo
No `app.js`:
```javascript
const currentModel = "vosk-model-en";
// Futuro:
// const currentModel = "vosk-model-pt";
```
