// Recebe o CPF com ou sem pontuação e devolve só os 11 dígitos, ou null se for inválido.
function validarCpf(cpf) {
	const numeros = String(cpf || "").replace(/\D/g, "")

	if (numeros.length !== 11) return null
	if (/^(\d)\1{10}$/.test(numeros)) return null // 000.000.000-00, 111..., etc.

	const calcularDigito = (base) => {
		let soma = 0
		for (let i = 0; i < base.length; i++) {
			soma += Number(base[i]) * (base.length + 1 - i)
		}
		const resto = (soma * 10) % 11
		return resto === 10 ? 0 : resto
	}

	const digito1 = calcularDigito(numeros.slice(0, 9))
	const digito2 = calcularDigito(numeros.slice(0, 10))

	if (digito1 !== Number(numeros[9]) || digito2 !== Number(numeros[10])) return null

	return numeros
}

module.exports = validarCpf
