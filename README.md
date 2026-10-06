# Checklist SMART — PWA

Projeto inicial para GitHub Pages do Checklist SMART — Áreas de Emergência, baseado no modelo fornecido.

## Estrutura

- `index.html` — interface
- `css/style.css` — identidade visual preta/branca/cinza
- `js/app.js` — checklist, histórico, PDF e compartilhamento
- `manifest.json` — PWA
- `sw.js` — cache offline
- `assets/logo.png` — logo Hospital Rio Grande / DTI

## Publicação no GitHub Pages

1. Crie um repositório no GitHub.
2. Envie todos os arquivos mantendo as pastas.
3. Em Settings > Pages, selecione a branch `main` e a pasta `/root`.
4. Abra a URL do GitHub Pages em Chrome/Edge no tablet.
5. Use "Adicionar à tela inicial" / "Instalar aplicativo".

## PDF e compartilhamento

O projeto usa jsPDF por CDN na primeira versão. A geração do PDF funciona quando a biblioteca estiver disponível.
Em Android/Chrome e navegadores compatíveis, `Compartilhar PDF` usa a Web Share API para abrir o menu nativo do aparelho.

Para funcionamento 100% offline, recomendo colocar uma cópia local de `jspdf.umd.min.js` em `vendor/` e trocar a tag CDN no `index.html` por:
`<script src="vendor/jspdf.umd.min.js"></script>`

## Observação

A V1 recria o conteúdo do modelo em PDF via JavaScript; ela não edita diretamente o arquivo DOCX original. As variáveis do modelo foram mapeadas para os campos da aplicação.

\n## Google Drive\n\n
A V2 possui integração por Google Apps Script. Configure a URL `/exec` em `js/config.js`.
Os arquivos são enviados para a pasta configurada no `google-apps-script/Code.gs`.
O nome gerado é `Checklist - DD-MM-AAAA.pdf`.
