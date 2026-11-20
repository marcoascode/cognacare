export interface IEfiCredentials {
    sandbox: boolean;
    client_id: string;
    client_secret: string;
    certificate: string;
}

const credentials: IEfiCredentials = {
    // PRODUÇÃO = false
    // HOMOLOGAÇÃO = true
    sandbox: false,
    client_id: 'seu_client_id',
    client_secret: 'seu_client_secret',
    certificate: 'caminho/ate/seu/certificado.p12',
};

export default credentials;