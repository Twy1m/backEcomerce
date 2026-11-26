// Popula o banco com categorias, produtos (com imagens extras) e cupons. Não cria usuários.
// Rodar depois do "npm run sync":  npm run seed
// Pode rodar mais de uma vez: o que já existe (mesmo nome / mesmo código) é pulado.

const conn = require("./db/conn")
const { Categoria, Produto, ImagemProduto, Cupom } = require("./models/rel")

// imagens de exemplo: o "seed" na URL faz a mesma foto voltar sempre
const img = (chave) => `https://picsum.photos/seed/${chave}/800/800`

const CATEGORIAS = [
	{ nome: "Câmeras", descricao: "Câmeras mirrorless, DSLR e compactas" },
	{ nome: "Lentes", descricao: "Lentes fixas e zoom para diversas montagens" },
	{ nome: "Iluminação", descricao: "Flashes, painéis de LED e acessórios de luz" },
	{ nome: "Acessórios", descricao: "Tripés, bolsas, cartões de memória e baterias" },
	{ nome: "Áudio", descricao: "Microfones e gravadores para vídeo" }
]

// categoria = nome da categoria acima; imagens = extras (a principal vai em imagem_principal)
const PRODUTOS = [
	{ nome: "Canon EOS R6 Mark II", categoria: "Câmeras", preco: 15999.9, estoque: 5, promocao: false, visualizacoes: 120,
	  descricao: "Mirrorless full frame de 24,2 MP, vídeo 4K 60p, estabilização no corpo e foco automático com detecção de pessoas e animais." },
	{ nome: "Sony Alpha a7 IV", categoria: "Câmeras", preco: 16499.0, estoque: 4, promocao: true, visualizacoes: 98,
	  descricao: "Full frame de 33 MP, vídeo 4K 10 bits, tela articulada e excelente desempenho em pouca luz." },
	{ nome: "Fujifilm X-T5", categoria: "Câmeras", preco: 11299.0, estoque: 6, promocao: false, visualizacoes: 75,
	  descricao: "APS-C de 40 MP com controles analógicos, simulações de filme e corpo compacto resistente ao tempo." },
	{ nome: "Nikon Z50", categoria: "Câmeras", preco: 5999.0, estoque: 8, promocao: true, visualizacoes: 60,
	  descricao: "Mirrorless APS-C leve, ideal para quem está começando, com vídeo 4K e tela inclinável." },

	{ nome: "Canon RF 50mm f/1.8 STM", categoria: "Lentes", preco: 1499.0, estoque: 15, promocao: false, visualizacoes: 88,
	  descricao: "Lente fixa leve e luminosa, ótima para retratos e fundo desfocado." },
	{ nome: "Sony FE 24-70mm f/2.8 GM II", categoria: "Lentes", preco: 13999.0, estoque: 3, promocao: false, visualizacoes: 54,
	  descricao: "Zoom profissional versátil, nítida em toda a faixa e com foco rápido e silencioso." },
	{ nome: "Sigma 35mm f/1.4 DG DN Art", categoria: "Lentes", preco: 5299.0, estoque: 7, promocao: true, visualizacoes: 41,
	  descricao: "Grande-angular clássica com abertura f/1.4, excelente para fotografia de rua e eventos." },

	{ nome: "Godox V1 Flash", categoria: "Iluminação", preco: 1899.0, estoque: 10, promocao: false, visualizacoes: 33,
	  descricao: "Flash de cabeça redonda com bateria de lítio, TTL e HSS, compatível com várias marcas." },
	{ nome: "Painel LED Aputure Amaran 200d", categoria: "Iluminação", preco: 2799.0, estoque: 6, promocao: true, visualizacoes: 47,
	  descricao: "Luz contínua de 200 W, temperatura de 5600 K e controle pelo celular." },

	{ nome: "Tripé Manfrotto Befree Advanced", categoria: "Acessórios", preco: 1299.0, estoque: 12, promocao: false, visualizacoes: 29,
	  descricao: "Tripé de viagem em alumínio, compacto, com cabeça esférica e trava rápida." },
	{ nome: "Cartão SanDisk Extreme Pro 128GB", categoria: "Acessórios", preco: 289.9, estoque: 40, promocao: true, visualizacoes: 65,
	  descricao: "Cartão SDXC UHS-I com até 200 MB/s de leitura, ideal para fotos em sequência e vídeo 4K." },
	{ nome: "Mochila Peak Design Everyday 20L", categoria: "Acessórios", preco: 1899.0, estoque: 0, promocao: false, visualizacoes: 22,
	  descricao: "Mochila com divisórias ajustáveis, acesso lateral e espaço para notebook de até 15 polegadas." },

	{ nome: "Microfone Rode VideoMic NTG", categoria: "Áudio", preco: 1799.0, estoque: 9, promocao: false, visualizacoes: 38,
	  descricao: "Shotgun compacto para câmera, com saída automática e bateria recarregável." },
	{ nome: "Kit Rode Wireless GO II", categoria: "Áudio", preco: 2199.0, estoque: 5, promocao: true, visualizacoes: 52,
	  descricao: "Sistema de microfone sem fio com dois transmissores, gravação interna e alcance de até 200 m." }
]

const CUPONS = [
	{ codigo: "BEMVINDO10", desconto: 10, validade: "2027-12-31T23:59:59", usos: 100 },
	{ codigo: "BLACKFRIDAY25", desconto: 25, validade: "2026-11-30T23:59:59", usos: 50 },
	{ codigo: "FRETEFOTO5", desconto: 5, validade: "2027-06-30T23:59:59", usos: 200 },
	{ codigo: "EXPIRADO15", desconto: 15, validade: "2025-01-31T23:59:59", usos: 10 } // para testar cupom vencido
]

// transforma o nome em algo usável na URL da imagem: "Canon EOS R6" → "canon-eos-r6"
const slug = (texto) =>
	texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")

async function seed() {
	const contagem = { categorias: 0, produtos: 0, imagens: 0, cupons: 0 }

	await conn.transaction(async (transaction) => {
		const idPorCategoria = {}
		for (const dados of CATEGORIAS) {
			const [categoria, criada] = await Categoria.findOrCreate({
				where: { nome: dados.nome },
				defaults: dados,
				transaction
			})
			idPorCategoria[dados.nome] = categoria.codCategoria
			if (criada) contagem.categorias++
		}

		for (const { categoria, ...dados } of PRODUTOS) {
			const chave = slug(dados.nome)
			const [produto, criado] = await Produto.findOrCreate({
				where: { nome: dados.nome },
				defaults: { ...dados, idCategoria: idPorCategoria[categoria], imagem_principal: img(chave) },
				transaction
			})
			if (!criado) continue
			contagem.produtos++

			// 2 imagens extras por produto (aparecem no hover e na galeria da página do produto)
			await ImagemProduto.bulkCreate(
				[1, 2].map((n) => ({ idProduto: produto.codProduto, url_imagem: img(`${chave}-${n}`) })),
				{ transaction }
			)
			contagem.imagens += 2
		}

		for (const dados of CUPONS) {
			const [, criado] = await Cupom.findOrCreate({
				where: { codigo: dados.codigo },
				defaults: { ...dados, validade: new Date(dados.validade) },
				transaction
			})
			if (criado) contagem.cupons++
		}
	})

	console.log("Seed concluído. Inseridos:", contagem)
}

seed()
	.catch((err) => {
		console.error("Erro ao rodar o seed:", err)
		process.exitCode = 1
	})
	.finally(() => conn.close())
