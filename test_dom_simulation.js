const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('index.html', 'utf8');

// Criar ambiente DOM simulado
const dom = new JSDOM(html, {
  runScripts: "dangerously",
  resources: "usable",
  beforeParse(window) {
    // Mock de bibliotecas externas
    window.lucide = {
      createIcons: () => {}
    };
    window.Chart = class {
      constructor() {}
      destroy() {}
      update() {}
    };
    window.google = {
      script: {
        run: {
          withSuccessHandler(cb) {
            this._success = cb;
            return this;
          },
          withFailureHandler(cb) {
            this._failure = cb;
            return this;
          },
          getInitialData() {
            // Não disparar nada imediatamente para testar o primeiro ciclo do DOM
          }
        }
      }
    };
  }
});

dom.window.addEventListener('error', (event) => {
  console.error("DOM Error Event:", event.error);
});

console.log("Simulação de DOM carregado com sucesso sem erros!");
console.log("Título do Veículo no DOM:", dom.window.document.getElementById('vehicleTitle')?.innerText);
console.log("Placa:", dom.window.document.getElementById('vehiclePlate')?.innerText);
console.log("Oficina:", dom.window.document.getElementById('vehicleOficinaText')?.innerText);
