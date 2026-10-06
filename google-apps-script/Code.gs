const FOLDER_ID = "1LJzLUcJdIonsSt2HjI3EAUWBPWvRSvQs";

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      throw new Error("Nenhum conteúdo foi recebido.");
    }

    const dados = JSON.parse(e.postData.contents);

    if (!dados.filename || !dados.data) {
      throw new Error("Nome do arquivo ou PDF não informado.");
    }

    const pasta = DriveApp.getFolderById(FOLDER_ID);

    const bytes = Utilities.base64Decode(dados.data);

    const blob = Utilities.newBlob(
      bytes,
      "application/pdf",
      dados.filename
    );

    const arquivo = pasta.createFile(blob);

    if (dados.metadata) {
      arquivo.setDescription(
        "CHECKLIST SMART - ÁREAS DE EMERGÊNCIA\n\n" +
        "Responsável: " + (dados.metadata.nome || "") + "\n" +
        "Matrícula: " + (dados.metadata.matricula || "") + "\n" +
        "Data: " + (dados.metadata.data || "")
      );
    }

    return resposta({
      sucesso: true,
      arquivo: arquivo.getName(),
      id: arquivo.getId(),
      url: arquivo.getUrl()
    });

  } catch (erro) {
    return resposta({
      sucesso: false,
      erro: String(erro)
    });
  }
}

function resposta(objeto) {
  return ContentService
    .createTextOutput(JSON.stringify(objeto))
    .setMimeType(ContentService.MimeType.JSON);
}
