# Agenda Inteligente — versão 2.0

Aplicativo React Native + Expo + TypeScript, com funcionamento offline e armazenamento SQLite local.

## Recursos
- Calendário mensal e semanal com indicadores de atividades e agenda do dia.
- Lembretes locais múltiplos: na hora, 5, 10, 15, 30, 60 minutos ou 1 dia antes.
- Repetição diária, semanal, mensal ou em dias escolhidos.
- Ao concluir uma ocorrência recorrente, a próxima é criada automaticamente.
- Subtarefas e acompanhamento das etapas.
- Meta diária configurável e barra de progresso.
- Busca, filtros por status, atrasadas e histórico.
- Adiar tarefas atrasadas para o dia seguinte, mantendo o horário.
- Migração aditiva do banco de dados da versão anterior para preservar tarefas.

## Instalação
Requisitos: Node.js LTS e npm.

```bash
npm install
npx expo install --fix
npx expo start
```

Abra no Expo Go ou pressione `a` para emulador Android. Para testes de notificações em segundo plano, prefira um development build ou APK instalado.

## Observações
- Notificações são locais e não exigem internet.
- Permita notificações no Android. Restrições de bateria do fabricante podem atrasar alertas.
- Em edição, os lembretes antigos são cancelados e os novos são programados.
- Tarefas recorrentes criam a próxima ocorrência ao concluir a atual, evitando agendar indefinidamente ocorrências futuras.
- A recorrência mensal ajusta datas inexistentes ao último dia do mês.
- Backup/exportação e restauração automática de notificações após reinicialização são melhorias futuras.

## Estrutura
```text
agenda-inteligente/
├── App.tsx
├── app.json
├── package.json
└── src/
    ├── components/TaskCard.tsx
    ├── screens/TaskForm.tsx
    ├── screens/CalendarScreen.tsx
    ├── services/database.ts
    ├── services/notifications.ts
    ├── services/recurrence.ts
    └── types.ts
```
