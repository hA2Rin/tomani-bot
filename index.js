require('dotenv').config();
require('http').createServer((req, res) => res.end('Bot is running!')).listen(process.env.PORT || 3000, () => {
    console.log(`Render 포트 감지 서버가 ${process.env.PORT || 3000}번 포트에서 실행 중입니다.`);
});
const { Client, GatewayIntentBits, ApplicationCommandOptionType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const mongoose = require('mongoose');
const YouTube = require('youtube-sr').default;

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ] 
});

const warningSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    count: { type: Number, default: 0 }
});
const Warning = mongoose.model('Warning', warningSchema);

const forbiddenWords = ['시발', '병신', '개새끼', '느금마'];

mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('몽고DB가 성공적으로 연결되었습니다.'))
    .catch((err) => console.error('몽고DB에 성공적으로 연결하지 못했습니다.'));

client.once('ready', async () => {
    console.log(`${client.user.tag}봇이 성공적으로 실행되었습니다`);

    const myCommand = [
        { name: 'ping', description: '봇 생존 확인용' },
        { name: '안녕', description: '인사하기' },
        { name: '히힣', description: '히히히' },
        { name: '집가고싶다', description: '집가는 방법 10가지' },
        { name: '갇히는쉑', description: '???' },
        { name: 'wa', description: '샌즈!' },
        { name: '토만이ㄱㅇㅇ', description: '귀여워해주기' },
        { name: '토만이죽어', description: '음..' },
        { name: '토만이못생김', description: '흠..' },
        { name: '토만아나심심해', description: '심심함' },
        { name: 'ㅅㅅ', description: '에휴..' },
        { name: '너주인이누구야', description: '주인 확인' },
        { name: '노래추천', description: '노래 추천' },
        { name: '퍼리', description: '...?' },
        { name: '인마고', description: '탈출마렵다' },
        { name: '알라는위대하다', description: '에휴에요' },
        { name: '인원확인', description: '현재 서버의 총 인원수를 확인합니다.', defaultMemberPermissions: PermissionFlagsBits.Administrator},
        { name: '킥', description: '서버에서 유저를 추방합니다.', defaultMemberPermissions:PermissionFlagsBits.Administrator, options:[{name:'대상',description:'추방할 유저를 선택하세요',type:ApplicationCommandOptionType.User,required:true},{name: '사유',description: '추방 사유를 적으세요.',type:ApplicationCommandOptionType.String,required: false}]},
        {
            name: '경고',
            description: '관리자가 직접 유저에게 경고를 부여합니다.',
            defaultMemberPermissions: PermissionFlagsBits.Administrator,
            options: [
                { name: '대상', description: '경고를 줄 대상자를 선택하세요.', type: ApplicationCommandOptionType.User, required: true },
                { name: '이유', description: '경고를 부여하는 명확한 이유를 적으세요.', type: ApplicationCommandOptionType.String, required: true },
                { name: '무슨말', description: '해당 유저가 채팅으로 무슨 말을 했는지 적으세요.', type: ApplicationCommandOptionType.String, required: true },
                { 
                    name: '조치사항', 
                    description: '유저에게 취할 조치 사항을 선택하세요.', 
                    type: ApplicationCommandOptionType.String, 
                    required: true,
                    choices: [
                        { name: '구두 경고', value: '구두 경고' },
                        { name: '5분 타임아웃', value: '5분 타임아웃' },
                        { name: '20분 타임아웃', value: '20분 타임아웃' },
                        { name: '서버 추방 (킥)', value: '서버 추방 (킥)' },
                        { name: '서버 차단 (밴)', value: '서버 차단 (밴)' }
                    ]
                },
                { name: '누적경고수', description: '직접 지정할 누적 경고 수 (비워두면 자동 +1)', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        }
    ];

    try {
        await client.application.commands.set(myCommand);
        console.log('명령어 전역등록 성공');
    } catch (error) {
        console.error('명령어 등록 중 에러 발생:', error);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot || !message.guild) return;

    const triggeredWord = forbiddenWords.find(word => message.content.includes(word));
    
    if (triggeredWord) {
        try {
            await message.delete().catch(() => {});

            const timeoutDuration = 20 * 60 * 1000; 
            if (message.member && message.member.moderatable) {
                await message.member.timeout(timeoutDuration, `금지어 사용 적발 (\`${triggeredWord}\`)`).catch(console.error);
            }

            const userData = await Warning.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                { $inc: { count: 1 } },
                { upsert: true, new: true }
            );

            const warnChannel = message.guild.channels.cache.find(ch => ch.name === '경고-로그');
            
            const warnEmbed = new EmbedBuilder()
                .setTitle('🚨 [자동 제재] 금지어 감지 및 타임아웃')
                .setColor(0xFF0000)
                .addFields(
                    { name: '👤 시행자', value: `<@${client.user.id}>`, inline: true },
                    { name: '🎯 대상자', value: `<@${message.author.id}>`, inline: true },
                    { name: '📊 누적 경고 수', value: `**${userData.count}회**`, inline: true },
                    { name: '⏳ 조치 사항', value: `**20분간 채팅 금지 (타임아웃)**`, inline: true },
                    { name: '📝 경고 이유', value: `채팅 내 금지어 사용 (\`${triggeredWord}\`)` },
                    { name: '💬 무슨 말을 했는지', value: `\`\`\`${message.content}\`\`\`` }
                )
                .setTimestamp();

            if (warnChannel) {
                await warnChannel.send({ embeds: [warnEmbed] });
            } else {
                await message.channel.send({ content: `⚠️ <@${message.author.id}>님, 금지어 사용으로 경고 1회 누적 및 20분간 타임아웃 처리되었습니다.`, embeds: [warnEmbed] });
            }

        } catch (error) {
            console.error('자동 경고 처리 중 오류:', error);
        }
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const { commandName } = interaction;

    switch (commandName) {
        case 'ping':
            await interaction.reply('퐁');
            break;

        case '안녕':
            await interaction.reply('안녕하세요! 저는 이 서버의 봇 토마니라고 합니다! 반가워요!');
            break;

        case '히힣':
            await interaction.reply('히히히히힣ㅎ힣히히히ㅣㅎ');
            break;

        case '집가고싶다':
            await interaction.reply('1.탈출\n2.도주\n3.무단조퇴\n4.환풍구로 탈출\n5.기숙사 창문으로 탈출\n6.수업시간에 아프다고 구라치고 탈출\n7.교무실 간다고 구라치고 탈출\n8.선생님께 허락 받았다고 구라치고 탈출\n9.학년부장 싸인 도용해서 탈출\n10.보건실 간다고 구라치고 탈출\n');
            break;

        case 'wa':
            await interaction.reply('샌즈!');
            break;

        case '토만이ㄱㅇㅇ':
            await interaction.reply('헤헤,,감사해요!');
            break;

        case '토만이죽어':
            await interaction.reply('ㅠㅠㅠ 케찹은 좀....');
            break;

        case '토만이못생김':
            await interaction.reply('니얼굴ㅋ');
            break;

        case 'ㅅㅅ':
            await interaction.reply('성범죄 신고는 국번없이 1366.');
            break;

        case '갇히는쉑':
            await interaction.reply('[뭐라카노](<https://www.youtube.com/shorts/aTQl3ehGP6Y>)');
            break;

        case '너주인이누구야':
            await interaction.reply('절 만드신 분은 `하이린`님이고요 절 관리하시는 분은 `토맹이`님이에요!');
            break;

        case '노래추천': 
            await interaction.deferReply();

            try {   
                const keywords = ['인기 가요', '팝송 플레이리스트', 'J-POP 명곡', '신나는 아이돌 노래', '힙합 플레이리스트', '애니 OST 명곡', '시티팝'];
                const keyword = keywords[Math.floor(Math.random() * keywords.length)];

                const searchResults = await YouTube.search(keyword, { limit: 15, type: 'video' });

                if (!searchResults || searchResults.length === 0) {
                    return await interaction.editReply('🎵 노래를 찾는 데 실패했어요. 다시 시도해 주세요!');
                }
                const randomVideo = searchResults[Math.floor(Math.random() * searchResults.length)];

                await interaction.editReply(`🎵 토마니의 추천 곡!\n👉 [${randomVideo.title}](${randomVideo.url})`);

            } catch (error) {
                console.error('유튜브 검색 에러:', error);
                await interaction.editReply('❌ 유튜브에서 노래를 가져오는 중 오류발생!');
            }
            break;

        case '퍼리':
            await interaction.reply('나가라');
            break;

        case '인마고':
            await interaction.reply('시발 집에 보내줘 이시발ㄹㄹㄹㄹ');
            break;

        case '알라는위대하다':
            await interaction.reply('테러 예정 또는 예고장 발견시 국번없이 111(국가정보원) 또는 112(경찰청))으로 신고.');
            break;

        case '인원확인': {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const isSubOwner = interaction.member.roles.cache.some(role => role.name === '부서버장');

            if (!isOwner && !isSubOwner) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 부서버장만 사용할 수 있습니다.', ephemeral: true });
            }

            await interaction.reply(`📊 현재 서버의 총 인원수는 **${interaction.guild.memberCount}명**입니다!`);
            break;
        }

        case '킥': {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const isSubOwner = interaction.member.roles.cache.some(role => role.name === '부서버장');

            if (!isOwner && !isSubOwner) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 부서버장님만 사용할 수 있습니다!', ephemeral: true });
            }

            const targetMember = interaction.options.getMember('대상');
            const reason = interaction.options.getString('사유') || '사유가 작성되지 않았습니다.';

            if (!targetMember) {
                return await interaction.reply({ content: '❌ 서버에 존재하지 않는 유저입니다.', ephemeral: true });
            }
            if (!targetMember.kickable) {
                return await interaction.reply({ content: '❌ 토만이보다 권한이 높거나 최고 관리자는 추방할 수 없습니다!', ephemeral: true });
            }

            try {
                await targetMember.kick(reason);
                await interaction.reply(`🚨 **${targetMember.user.tag}**님이 서버에서 추방되었습니다.\n📝 사유: ${reason}`);
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ 유저를 추방하는 중 에러가 발생했습니다.', ephemeral: true });
            }
            break;
        }

        case '경고': {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const isSubOwner = interaction.member.roles.cache.some(role => role.name === '부서버장' || role.name === '부관리장');

            if (!isOwner && !isSubOwner) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 부서버장/부관리장님만 사용할 수 있습니다!', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('대상');
            const reason = interaction.options.getString('이유');
            const whatTheySaid = interaction.options.getString('무슨말');
            const actionTaken = interaction.options.getString('조치사항');
            const customCount = interaction.options.getInteger('누적경고수');

            let finalCount;

            if (customCount !== null) {
                await Warning.findOneAndUpdate(
                    { guildId: interaction.guild.id, userId: targetUser.id },
                    { count: customCount },
                    { upsert: true }
                ).catch(() => {});
                finalCount = customCount;
            } else {
                const userData = await Warning.findOneAndUpdate(
                    { guildId: interaction.guild.id, userId: targetUser.id },
                    { $inc: { count: 1 } },
                    { upsert: true, new: true }
                ).catch(() => {});
                finalCount = userData ? userData.count : 1;
            }

            const warnChannel = interaction.guild.channels.cache.find(ch => ch.name === '경고-로그');
            
            const manualEmbed = new EmbedBuilder()
                .setTitle('⚠️ [수동 제재] 관리자 경고')
                .setColor(0xFFCC00)
                .addFields(
                    { name: '👤 시행자', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🎯 대상자', value: `<@${targetUser.id}>`, inline: true },
                    { name: '📊 누적 경고 수', value: `**${finalCount}회**`, inline: true },
                    { name: '⏳ 조치 사항', value: `**${actionTaken}**`, inline: true },
                    { name: '📝 경고 이유', value: reason },
                    { name: '💬 무슨 말을 했는지', value: `\`\`\`${whatTheySaid}\`\`\`` }
                )
                .setTimestamp();

            if (warnChannel) {
                await warnChannel.send({ embeds: [manualEmbed] }).catch(() => {});
            }

            await interaction.reply({ content: `🚨 <@${targetUser.id}>님에게 수동 경고를 부여했습니다.`, embeds: [manualEmbed] });
            break;
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
