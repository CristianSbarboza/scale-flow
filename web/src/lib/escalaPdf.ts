/**
 * Exportação da escala em PDF, feita sem biblioteca de PDF.
 *
 * O caminho é montar um documento A4 próprio num iframe escondido e chamar
 * `print()`: o navegador oferece "Salvar como PDF" no diálogo, em desktop e em
 * celular. Uma lib como a jsPDF resolveria com download direto, mas custa
 * ~400 KB e uma fonte embutida para os acentos saírem certos — caro para um
 * botão de tela de administração. Aqui o texto sai selecionável, os acentos
 * vêm da fonte do sistema e o cabeçalho da tabela se repete a cada página de
 * graça, pelo `display: table-header-group`.
 *
 * O documento é intencionalmente preto no branco, sem os tokens do design
 * system: ele é papel, não a tela, e não segue o tema do app.
 */

interface EscalaImpressa {
  name: string;
  ministry: { name: string };
  sector: { name: string };
}

interface DataImpressa {
  date: string;
  startTime: string;
  assignments: { servant: { user: { name: string } } }[];
}

/** Nome de servo vai para dentro de HTML — sem isto, um `<` quebra o documento. */
function escapar(texto: string) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * `T00:00:00` sem fuso, e não `new Date("2026-09-05")`, que o JS lê como UTC e
 * exibe como dia 4 em qualquer fuso a oeste de Greenwich. Mesma leitura que a
 * tela de escalação faz.
 */
function diaDe(date: string) {
  return new Date(`${date.slice(0, 10)}T00:00:00`);
}

function corpoDoDocumento(escala: EscalaImpressa, dates: DataImpressa[]) {
  const linhas = dates.flatMap((d) =>
    d.assignments
      .map((a) => a.servant.user.name)
      .sort((a, b) => a.localeCompare(b, "pt-BR"))
      .map((nome, indice) => {
        const dia = diaDe(d.date);
        return {
          nome,
          data: dia.toLocaleDateString("pt-BR"),
          diaDaSemana: dia.toLocaleDateString("pt-BR", { weekday: "long" }),
          hora: d.startTime.slice(0, 5),
          // Só a primeira pessoa do dia leva o traço mais forte em cima: é o
          // que separa um culto do outro numa lista que repete a data.
          abreODia: indice === 0,
        };
      }),
  );

  const cabecalho = `
    <header>
      <h1>${escapar(escala.name)}</h1>
      <p class="sub">${escapar(escala.ministry.name)} · ${escapar(escala.sector.name)}</p>
      <p class="meta">${linhas.length} ${linhas.length === 1 ? "escalação" : "escalações"} · gerado em ${new Date().toLocaleDateString("pt-BR")}</p>
    </header>`;

  if (linhas.length === 0) {
    return `${cabecalho}<p class="vazio">Nenhum servo confirmado nesta escala.</p>`;
  }

  return `${cabecalho}
    <table>
      <thead>
        <tr><th>Nome</th><th>Data</th><th>Dia</th><th>Hora</th></tr>
      </thead>
      <tbody>
        ${linhas
          .map(
            (l) => `<tr${l.abreODia ? ' class="abre-dia"' : ""}>
              <td>${escapar(l.nome)}</td>
              <td>${l.data}</td>
              <td class="dia">${l.diaDaSemana}</td>
              <td>${l.hora}</td>
            </tr>`,
          )
          .join("")}
      </tbody>
    </table>`;
}

const ESTILO = `
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    color: #111;
    background: #fff;
    font: 12px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  header { border-bottom: 2px solid #111; padding-bottom: 0.75rem; margin-bottom: 1.25rem; }
  h1 { margin: 0 0 0.25rem; font-size: 1.25rem; }
  .sub { margin: 0; font-size: 0.8125rem; color: #444; }
  .meta { margin: 0.5rem 0 0; font-size: 0.6875rem; color: #777; }
  .vazio { color: #777; font-style: italic; }
  table { width: 100%; border-collapse: collapse; }
  /* Repete o cabeçalho da tabela em toda página, e não corta uma linha ao meio. */
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  th {
    padding: 0.5rem 0.625rem;
    text-align: left;
    font-size: 0.625rem;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #555;
    border-bottom: 1px solid #111;
  }
  td { padding: 0.5rem 0.625rem; border-bottom: 1px solid #e6e6e6; }
  tr.abre-dia td { border-top: 1px solid #b0b0b0; }
  tbody tr:first-child td { border-top: none; }
  .dia::first-letter { text-transform: uppercase; }
`;

/**
 * Abre o diálogo de impressão com a escala já formatada. Só os confirmados —
 * quem apenas marcou disponibilidade não está escalado, e uma lista impressa
 * misturando os dois vira gente aparecendo no dia errado.
 *
 * O título do documento é o nome da escala, sem prefixo: é ele que o navegador
 * sugere como nome do arquivo salvo, e quase toda escala já se chama "Escala de
 * alguma coisa".
 */
export function exportarEscalaPdf(escala: EscalaImpressa, dates: DataImpressa[]) {
  const ANTERIOR = "escala-para-imprimir";
  document.getElementById(ANTERIOR)?.remove();

  const iframe = document.createElement("iframe");
  iframe.id = ANTERIOR;
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;";

  iframe.srcdoc = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapar(escala.name)}</title>
    <style>${ESTILO}</style>
  </head>
  <body>${corpoDoDocumento(escala, dates)}</body>
</html>`;

  iframe.onload = () => {
    const janela = iframe.contentWindow;
    if (!janela) return;
    // `afterprint` chega tanto ao imprimir quanto ao cancelar; nos dois casos o
    // iframe já cumpriu o papel. Tirá-lo antes disso cancelaria a impressão.
    janela.addEventListener("afterprint", () => iframe.remove());
    janela.focus();
    janela.print();
  };

  document.body.appendChild(iframe);
}
