const storage = require('../storage');

function seedClientes() {
  const existingClientes = storage.listClientes();
  if (existingClientes.length > 0) {
    console.log('Clientes já existem na base, nenhum cliente criado.');
    return existingClientes;
  }

  const clientesData = [
    {
      nome: 'Juliana Carmen',
      telefone: '+55 51 99876-1122',
      email: 'juliana.carmen@example.com',
      cpf: '123.456.789-00',
      gender: 'F',
      birthDate: '1987-03-14',
      acceptsContact: true,
      userType: 'MF',
      userId: 'exotica',
      state: 'pos-venda',
      interests: ['Multifocal', 'Solar'],
      purchases: [
        {
          date: '2023-08-05',
          frame: 'Armação Prisma',
          frameMaterial: 'METAL',
          frameValue: 650,
          lens: 'Lente Vision 2',
          lensValue: 420,
          invoice: 'NF-JC-0823',
          dioptry: {
            oe: { spherical: '-1.50', cylindrical: '-0.50', axis: '80', dnp: '30', addition: '1.75' },
            od: { spherical: '-1.25', cylindrical: '-0.25', axis: '92', dnp: '31', addition: '1.75' },
          },
        },
        {
          date: '2024-03-12',
          frame: 'Armação Aurora',
          frameMaterial: 'ACETATO',
          frameValue: 820,
          lens: 'Lente Vision 3',
          lensValue: 540,
          invoice: 'NF-JC-1024',
          dioptry: {
            oe: { spherical: '-1.25', cylindrical: '-0.50', axis: '85', dnp: '31', addition: '2.00' },
            od: { spherical: '-1.00', cylindrical: '-0.25', axis: '90', dnp: '30', addition: '1.75' },
          },
        },
      ],
    },
    {
      nome: 'Carlos Andrade',
      telefone: '+55 11 93456-7788',
      email: 'carlos.andrade@example.com',
      cpf: '987.654.321-11',
      gender: 'M',
      birthDate: '1979-11-22',
      acceptsContact: false,
      userType: 'VS',
      userId: 'jorel-avenida',
      state: 'oferta',
      interests: ['Visão Simples', 'Relógios'],
      purchases: [
        {
          date: '2022-12-18',
          frame: 'Armação Horizonte',
          frameMaterial: 'TITANIUM',
          frameValue: 910,
          lens: 'Lente Premium 1.67',
          lensValue: 670,
          invoice: 'NF-CA-1222',
          dioptry: {
            oe: { spherical: '-2.75', cylindrical: '-0.75', axis: '100', dnp: '32', addition: null },
            od: { spherical: '-2.50', cylindrical: '-0.50', axis: '95', dnp: '31', addition: null },
          },
        },
        {
          date: '2024-01-27',
          frame: 'Armação Orion',
          frameMaterial: 'METAL',
          frameValue: 780,
          lens: 'Lente Vision Blue',
          lensValue: 460,
          invoice: 'NF-CA-0124',
          dioptry: {
            oe: { spherical: '-2.60', cylindrical: '-0.75', axis: '98', dnp: '32', addition: null },
            od: { spherical: '-2.35', cylindrical: '-0.50', axis: '94', dnp: '31', addition: null },
          },
        },
      ],
    },
    {
      nome: 'Marina Lopes',
      telefone: '+55 21 98800-3344',
      email: 'marina.lopes@example.com',
      cpf: '456.789.123-55',
      gender: 'F',
      birthDate: '1992-06-08',
      acceptsContact: true,
      userType: 'BF',
      userId: 'jorel-chicuta',
      state: 'nao-contatar',
      interests: ['Bifocal', 'Jóias'],
      purchases: [
        {
          date: '2023-04-15',
          frame: 'Armação Clarity',
          frameMaterial: 'ACETATO',
          frameValue: 720,
          lens: 'Lente Comfort 2',
          lensValue: 510,
          invoice: 'NF-ML-0423',
          dioptry: {
            oe: { spherical: '+1.25', cylindrical: '-0.25', axis: '75', dnp: '29', addition: '1.50' },
            od: { spherical: '+1.00', cylindrical: '-0.25', axis: '78', dnp: '30', addition: '1.50' },
          },
        },
        {
          date: '2024-02-09',
          frame: 'Armação Lumi',
          frameMaterial: 'OUTROS',
          frameValue: 560,
          lens: 'Lente Progressiva Lite',
          lensValue: 590,
          invoice: 'NF-ML-0224',
          dioptry: {
            oe: { spherical: '+1.35', cylindrical: '-0.25', axis: '80', dnp: '29', addition: '1.75' },
            od: { spherical: '+1.10', cylindrical: '-0.25', axis: '82', dnp: '30', addition: '1.75' },
          },
        },
      ],
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
      data: '2024-04-05',
      titulo: 'Entrega de novos óculos',
      descricao: 'Agendamento da entrega e ajuste dos óculos multifocais de Juliana Carmen.',
      cor: '#FF5733',
      clienteNome: 'Juliana Carmen',
      usuario_id: 'exotica',
    },
    {
      data: '2024-05-18',
      titulo: 'Contato de oferta',
      descricao: 'Ligação para apresentar armações metálicas premium para Carlos Andrade.',
      cor: '#33C1FF',
      clienteNome: 'Carlos Andrade',
      usuario_id: 'jorel-avenida',
    },
    {
      data: '2024-06-12',
      titulo: 'Revisão pós-venda',
      descricao: 'Revisar adaptação das lentes progressivas de Marina Lopes após 4 meses.',
      cor: '#8E44AD',
      clienteNome: 'Marina Lopes',
      usuario_id: 'jorel-chicuta',
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
