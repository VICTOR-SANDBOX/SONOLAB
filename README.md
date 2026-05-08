# SONOLAB

Um sistema ágil e interativo de sonoplastia desenvolvido em HTML, CSS e JavaScript puro (Web Audio API). Foi idealizado com foco em usabilidade e workflow avançado para o controle de efeitos sonoros, trilhas musicais e ambiências em peças de teatro, podcasts e apresentações ao vivo. Sem necessidade de servidores ou bancos de dados, o SONOLAB opera 100% no cliente (no seu navegador).

<img width="1920" height="924" alt="{0C83389E-5E98-4E3B-BAAE-DA9706B9C8FD}" src="https://github.com/user-attachments/assets/7f4f040c-f6d2-4158-ba79-7f4c0032c518" />

## Principais Funcionalidades

### Roteiro da Peça (Script Automático)
* **Texto Responsivo e Reordenável:** As caixas de fala redimensionam automaticamente dependendo do tamanho do texto. Use o ícone de arraste (☰) para reordenar os blocos de cena (drag and drop) de forma rápida.
* **Cues de Áudio Inline (Tags):** Arraste qualquer som do painel e solte-o no meio do texto. Ele vira uma "tag" interativa (inline cue). Você pode disparar o som apenas clicando nela, ou apagá-la clicando no botão de excluir (×).
* **Botão "GO" (Avanço Sequencial):** Assim como nos softwares profissionais de teatro (ex: QLab), basta apertar a tecla ESPAÇO (ou clicar no botão "GO") para disparar o próximo som na ordem em que aparecem no roteiro. O sistema destaca de amarelo o som disparado no momento.

### Soundboard Interativo e Customizável
* **Upload Simples:** Adicione seus próprios áudios do computador.
* **Categorias Dinâmicas:** Filtre faixas por categorias (Efeitos, Ambiente, Músicas). Clique com o botão direito para renomear, deletar ou criar novas categorias.
* **Múltiplos Disparos (Macros/Grupos):** Crie um cartão "Grupo" que agrupa vários áudios sob um mesmo atalho. Ao acioná-lo, todos os áudios associados tocam simultaneamente (ótimo para "Trovão + Chuva + Grito").
* **Atalhos de Teclado (Hotkeys):** Cada som pode receber uma tecla exclusiva do seu teclado (ex: A, B, 1, 2). O botão passa a exibir um indicativo visual (badge) do atalho selecionado.
* **Edição Prática:** Renomeie sons rapidamente clicando com o botão direito (menu de contexto) sobre o card.

### Efeitos de Áudio e Edição por Som (Web Audio API)
Cada card possui um botão de Configuração independente que permite ajustar:
* **Fade In / Fade Out:** Transições de áudio super suaves em segundos.
* **Velocidade/Pitch e Panning:** Ajuste o balanço esquerdo/direito e se a faixa está rápida, lenta, aguda ou grave.
* **Filtros e Efeitos:** Aplique equalização de Rádio (High-pass), Som Abafado (Low-pass), Reverb e Delay/Eco sem precisar editar o arquivo de áudio.
* **Auto-Ducking:** Permite que o som (ao tocar) reduza automaticamente o volume de todas as músicas de fundo e depois restaure o volume gradativamente quando termina.

### Painel de Tracks Ativas e Crossfade
* **Painel Dinâmico:** Sons longos não ficam "perdidos". Eles aparecem em uma aba inferior de Trilhas Ativas, possuindo controle de volume em tempo real e barra de progresso do tempo.
* **Auto-Crossfade:** O sistema é inteligente: ao iniciar uma nova música (categoria music), ele detecta se há outra música tocando, e faz um crossfade perfeito (aplica Fade Out na música atual enquanto inicia a nova faixa).

### Master Settings (Controles Globais)
* **Equalizador Global (EQ):** Refine os graves, médios e agudos do sistema inteiro dependendo da acústica do teatro (botão "Master").
* **Botão de Pânico (ESC):** Corta todos os sons do sistema. Diferente de um corte seco, você pode regular o tempo de "Fade-Out do Pânico", fazendo os áudios pararem suavemente.

### Exportação e Importação (Projetos)
* Terminou de montar os áudios e roteiro da peça? Clique em Exportar para salvar tudo em um arquivo .json leve no seu computador. Depois, use o Importar para recuperar instantaneamente o layout e as falas em outro ensaio.

---

## Como Usar

Não é necessário rodar processos pesados como o Node.js. 
Basta dar dois cliques (abrir no navegador) no arquivo index.html na raiz do projeto e pronto. Aproveite o show!

## Créditos

* Ícone musical original: [Music note icons created by Freepik - Flaticon](https://www.flaticon.com/free-icon/musical-notes_2907253?term=music+note&page=1&position=12&origin=tag&related_id=2907253)
* UI & Engine desenvolvido com foco estrito nas necessidades dos sonoplastas.
