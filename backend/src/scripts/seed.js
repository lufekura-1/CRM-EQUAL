const storage = require('../storage');

function seedClientes() {
  const existingClientes = storage.listClientes();
  if (existingClientes.length > 0) {
    console.log('Clientes já existem na base, nenhum cliente criado.');
    return existingClientes;
  }

  const clientesData = [
    {
      nome: 'Acme Corp',
      telefone: '+55 11 4000-1234',
      email: 'contato@acmecorp.com',
    },
    {
      nome: 'Beta Solutions',
      telefone: '+55 21 3555-9876',
      email: 'suporte@betasolutions.com',
    },
    {
      nome: 'Gamma Tech',
      telefone: '+55 31 3222-4567',
      email: 'vendas@gammatech.com',
    },
  ];

  const createdClientes = clientesData.map((cliente) => storage.createCliente(cliente));
  console.log(`Criados ${createdClientes.length} clientes.`);
  return createdClientes;
}

function seedEventos(clientes) {
  const existingEventos = storage.listEventos();
  if (existingEventos.length > 0) {
    console.log('Eventos já existem na base, nenhum evento criado.');
    return existingEventos;
  }

  const clientesByName = new Map(clientes.map((cliente) => [cliente.nome, cliente]));

  const eventosData = [
    {
      data: '2024-05-10',
      titulo: 'Reunião de Alinhamento',
      descricao: 'Apresentação das metas do trimestre com a equipe da Acme Corp.',
      cor: '#FF5733',
      clienteNome: 'Acme Corp',
    },
    {
      data: '2024-05-18',
      titulo: 'Treinamento de Onboarding',
      descricao: 'Sessão inicial com novos usuários da Beta Solutions.',
      cor: '#33C1FF',
      clienteNome: 'Beta Solutions',
    },
    {
      data: '2024-06-02',
      titulo: 'Revisão de Contrato',
      descricao: 'Discussão sobre renovação contratual com a Gamma Tech.',
      cor: '#8E44AD',
      clienteNome: 'Gamma Tech',
    },
  ];

  const createdEventos = eventosData.map(({ clienteNome, ...evento }) => {
    const cliente = clientesByName.get(clienteNome);
    return storage.createEvento({
      ...evento,
      cliente_id: cliente ? cliente.id : null,
    });
  });

  console.log(`Criados ${createdEventos.length} eventos.`);
  return createdEventos;
}

function main() {
  try {
    const clientes = seedClientes();
    const allClientes = clientes.length ? clientes : storage.listClientes();
    seedEventos(allClientes);
    console.log('Seed concluído com sucesso.');
    process.exit(0);
  } catch (error) {
    console.error('Erro ao executar seed:', error);
    process.exit(1);
  }
}

main();
