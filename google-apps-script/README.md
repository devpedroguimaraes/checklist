# Integração Google Drive — Checklist SMART

A aplicação envia o PDF para a pasta:

`https://drive.google.com/drive/u/0/folders/1LJzLUcJdIonsSt2HjI3EAUWBPWvRSvQs`

ID:
`1LJzLUcJdIonsSt2HjI3EAUWBPWvRSvQs`

## 1. Criar o Web App

1. Abra https://script.google.com/
2. Crie um novo projeto.
3. Cole o conteúdo de `Code.gs`.
4. Salve.
5. Clique em **Implantar > Nova implantação**.
6. Selecione **Aplicativo da Web**.
7. **Executar como:** sua conta.
8. **Quem tem acesso:** qualquer pessoa.
9. Autorize o acesso ao Google Drive.
10. Copie a URL que termina em `/exec`.

## 2. Colocar a URL no projeto

Abra:

`js/config.js`

e troque:

`const GOOGLE_DRIVE_WEBAPP_URL = "";`

por:

`const GOOGLE_DRIVE_WEBAPP_URL = "SUA_URL_DO_APPS_SCRIPT/exec";`

## 3. Resultado

Ao finalizar um checklist, o aplicativo:

- gera o PDF;
- usa o nome `Checklist - DD-MM-AAAA.pdf`;
- envia o arquivo para a pasta do Drive;
- mostra o status na tela;
- se houver falha de rede, guarda o PDF localmente e tenta novamente quando a conexão voltar.

## Importante

A conta usada para executar o Apps Script precisa ter permissão de edição na pasta.

Não coloque senha, token OAuth ou credenciais Google no GitHub Pages.
