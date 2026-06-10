import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from "@react-pdf/renderer";

// ✅ TIPAGEM CORRETA (SEM any)
type Props = {
  empresa: {
    razaoSocial: string;
    cnpj: string;
  };
  usuario: {
    nome: string;
    email: string;
    telefone: string;
    documento: string;
  };
  contrato: {
    numero: string;
    versao: number;
    dataAceite: string;
    ip: string;
    userAgent: string;
  };
  hash: string;
  qrCode?: string; // ✅ CORREÇÃO PRINCIPAL
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    lineHeight: 1.5,
  },
  title: {
    fontSize: 16,
    marginBottom: 10,
    fontWeight: "bold",
  },
  section: {
    marginBottom: 12,
  },
  box: {
    border: "1px solid #ccc",
    padding: 10,
    borderRadius: 6,
    marginBottom: 10,
  },
  qr: {
    width: 80,
    height: 80,
    marginTop: 10,
  },
});

export function ContratoNR1PDF({
  empresa,
  usuario,
  contrato,
  hash,
  qrCode,
}: Props) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <Text style={styles.title}>CONTRATO DE PRESTAÇÃO DE SERVIÇOS NR‑1</Text>

        <Text>
          Contrato nº {contrato.numero} • Versão {contrato.versao}
        </Text>

        {/* EMPRESA */}
        <View style={styles.box}>
          <Text>CONTRATANTE:</Text>
          <Text>{empresa.razaoSocial}</Text>
          <Text>CNPJ: {empresa.cnpj}</Text>
        </View>

        {/* USUÁRIO */}
        <View style={styles.box}>
          <Text>RESPONSÁVEL:</Text>
          <Text>{usuario.nome}</Text>
          <Text>Email: {usuario.email}</Text>
          <Text>Telefone: {usuario.telefone}</Text>
          <Text>CPF: {usuario.documento}</Text>
        </View>

        {/* OBJETO */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>OBJETO</Text>
          <Text>
            Prestação de serviço de mapeamento de riscos psicossociais conforme
            NR‑1.
          </Text>
        </View>

        {/* NÃO REEMBOLSO */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>
            IRRETRATABILIDADE E NÃO REEMBOLSO
          </Text>
          <Text>
            Após o início do preenchimento dos questionários, não haverá
            reembolso.
          </Text>
        </View>

        {/* ACEITE */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>ACEITE DIGITAL</Text>
          <Text>Data: {contrato.dataAceite}</Text>
          <Text>IP: {contrato.ip}</Text>
        </View>

        {/* HASH */}
        <View style={styles.section}>
          <Text style={{ fontWeight: "bold" }}>HASH</Text>
          <Text>{hash}</Text>
        </View>

        {/* ✅ QR CODE CORRETO */}
        {qrCode ? (
          <View style={styles.section}>
            <Text>Validação do contrato:</Text>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={qrCode} style={styles.qr} />
          </View>
        ) : null}

        {/* ASSINATURA */}
        <View style={{ marginTop: 30 }}>
          <Text>________________________________</Text>
          <Text>{usuario.nome}</Text>
          <Text>Assinado eletronicamente</Text>
          <Text>MP 2.200-2/2001</Text>
        </View>
      </Page>
    </Document>
  );
}
