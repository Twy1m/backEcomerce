// Conta com dinheiro em JavaScript dá erro de arredondamento (0.1 + 0.2 = 0.30000000000000004).
// Por isso as contas são feitas em centavos (números inteiros) e só no fim viram reais.

// "4599.90" ou 4599.9 → 459990
function paraCentavos(valor) {
	return Math.round(Number(valor) * 100)
}

// 459990 → 4599.9
function paraReais(centavos) {
	return centavos / 100
}

module.exports = {
	paraCentavos,
	paraReais
}
