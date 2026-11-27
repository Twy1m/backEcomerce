const nodemailer = require("nodemailer")

// Configuração no .env:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, EMAIL_FROM
//   (SMTP_SECURE=true para a porta 465)
// Sem SMTP_HOST, fora de produção, o e-mail não é enviado: o conteúdo aparece no console
// (bom para desenvolvimento). Em produção, sem SMTP_HOST, o envio falha de propósito,
// para ninguém achar que o código foi enviado quando não foi.

const emProducao = process.env.NODE_ENV === "production"

let transporte = null
function obterTransporte() {
	if (transporte) return transporte
	transporte = nodemailer.createTransport({
		host: process.env.SMTP_HOST,
		port: Number(process.env.SMTP_PORT) || 587,
		secure: process.env.SMTP_SECURE === "true",
		auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
	})
	return transporte
}

async function enviarEmail({ para, assunto, texto, html }) {
	if (!process.env.SMTP_HOST) {
		if (emProducao) throw new Error("SMTP não configurado (SMTP_HOST vazio no .env)")
		console.log(`\n[email de desenvolvimento] para: ${para}\nassunto: ${assunto}\n${texto}\n`)
		return
	}

	await obterTransporte().sendMail({
		from: process.env.EMAIL_FROM || process.env.SMTP_USER,
		to: para,
		subject: assunto,
		text: texto,
		html
	})
}

module.exports = { enviarEmail }
