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

// 📊 1. 경고 데이터베이스 스키마
const warningSchema = new mongoose.Schema({
    guildId: String,
    userId: String,
    count: { type: Number, default: 0 }
});
const Warning = mongoose.model('Warning', warningSchema);

// ⚙️ 2. 서버 설정 데이터베이스 스키마 (경고 한도 저장용)
const guildSettingsSchema = new mongoose.Schema({
    guildId: { type: String, unique: true },
    maxWarnings: { type: Number, default: 5 }
});
const GuildSettings = mongoose.model('GuildSettings', guildSettingsSchema);

// 💡 패드립과 핵심 비속어를 모두 통합한 금지어 목록
const forbiddenWords = [
    '애미', '엠창', '앰창', '니애미', '니엠', '니앱', '느개미', '느그매', '느그아부지', '호로새끼', '호로자식', '고아', '고아새끼', '느금마'
];

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
                    // ✨ 1분부터 디스코드 한도인 28일까지 완벽 지원 (디스코드 제한상 최대 25개 선택지 구성)
                    choices: [
                        { name: '📢 구두 경고', value: '구두 경고' },
                        { name: '⏳ 1분 타임아웃', value: '1분 타임아웃' },
                        { name: '⏳ 5분 타임아웃', value: '5분 타임아웃' },
                        { name: '⏳ 10분 타임아웃', value: '10분 타임아웃' },
                        { name: '⏳ 30분 타임아웃', value: '30분 타임아웃' },
                        { name: '⏳ 1시간 타임아웃', value: '1시간 타임아웃' },
                        { name: '⏳ 2시간 타임아웃', value: '2시간 타임아웃' },
                        { name: '⏳ 4시간 타임아웃', value: '4시간 타임아웃' },
                        { name: '⏳ 8시간 타임아웃', value: '8시간 타임아웃' },
                        { name: '⏳ 12시간 타임아웃', value: '12시간 타임아웃' },
                        { name: '⏳ 18시간 타임아웃', value: '18시간 타임아웃' },
                        { name: '⏰ 하루 (24시간) 타임아웃', value: '하루 타임아웃' },
                        { name: '⏰ 이틀 (48시간) 타임아웃', value: '이틀 타임아웃' },
                        { name: '⏰ 사흘 (72시간) 타임아웃', value: '사흘 타임아웃' },
                        { name: '⏰ 나흘 (96시간) 타임아웃', value: '나흘 타임아웃' },
                        { name: '⏰ 일주일 (7일) 타임아웃', value: '7일 타임아웃' },
                        { name: '⏰ 이주일 (14일) 타임아웃', value: '14일 타임아웃' },
                        { name: '⏰ 삼주일 (21일) 타임아웃', value: '21일 타임아웃' },
                        { name: '⏰ 사주일 (28일 - 최대) 타임아웃', value: '28일 타임아웃' },
                        { name: '🚨 서버 추방 (킥)', value: '서버 추방 (킥)' },
                        { name: '🚫 서버 차단 (밴)', value: '서버 차단 (밴)' }
                    ]
                },
                { name: '누적경고수', description: '직접 지정할 누적 경고 수 (비워두면 자동 +1)', type: ApplicationCommandOptionType.Integer, required: false }
            ]
        },
        {
            name: '경고차감',
            description: '관리자가 유저의 누적 경고 수를 차감합니다.',
            defaultMemberPermissions: PermissionFlagsBits.Administrator,
            options: [
                { name: '대상', description: '경고를 차감할 대상 유저를 선택하세요.', type: ApplicationCommandOptionType.User, required: true },
                { name: '차감수', description: '차감할 경고 개수를 적으세요.', type: ApplicationCommandOptionType.Integer, required: true },
                { name: '사유', description: '경고를 차감해주는 명확한 사유를 적으세요.', type: ApplicationCommandOptionType.String, required: true }
            ]
        },
        {
            name: '경고한도',
            description: '서버의 최대 누적 경고 제한 수치를 확인하거나 수정합니다.',
            defaultMemberPermissions: PermissionFlagsBits.Administrator,
            options: [
                { name: '설정값', description: '변경할 경고 한도 숫자를 입력하세요. (비워두면 현재 한도 조회)', type: ApplicationCommandOptionType.Integer, required: false }
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

    const cleanContent = message.content.replace(/\s+/g, '');
    const triggeredWord = forbiddenWords.find(word => cleanContent.includes(word));
    
    if (triggeredWord) {
        try {
            await message.delete().catch(() => {});

            // ✨ 자동 제재 타임아웃 시간을 30분으로 변경 완료
            const timeoutDuration = 30 * 60 * 1000; 
            if (message.member && message.member.moderatable) {
                await message.member.timeout(timeoutDuration, `금지어 사용 적발 (\`${triggeredWord}\`)`).catch(console.error);
            }

            const userData = await Warning.findOneAndUpdate(
                { guildId: message.guild.id, userId: message.author.id },
                { $inc: { count: 1 } },
                { upsert: true, new: true }
            );

            const settings = await GuildSettings.findOne({ guildId: message.guild.id });
            const maxWarnings = settings ? settings.maxWarnings : 5;

            let extraAction = '**30분간 채팅 금지 (타임아웃)**';
            
            if (userData.count >= maxWarnings && message.member && message.member.kickable) {
                extraAction = `**🔥 경고 한도 초과 (${maxWarnings}회 이상)로 인한 서버 자동 추방 (킥)**`;
                await message.member.kick(`누적 경고 ${userData.count}회로 인한 경고 한도 초과 자동 제재`).catch(console.error);
            }

            const warnChannel = message.guild.channels.cache.find(ch => ch.name === '경고-로그');
            
            const warnEmbed = new EmbedBuilder()
                .setTitle('🚨 [자동 제재] 금지어 감지 및 타임아웃')
                .setColor(0xFF0000)
                .addFields(
                    { name: '👤 시행자', value: `<@${client.user.id}>`, inline: true },
                    { name: '🎯 대상자', value: `<@${message.author.id}>`, inline: true },
                    { name: '📊 누적 경고 수', value: `**${userData.count}회 / 최대 ${maxWarnings}회**`, inline: true },
                    { name: '⏳ 조치 사항', value: extraAction, inline: true },
                    { name: '📝 경고 이유', value: `채팅 내 금지어 사용 (\`${triggeredWord}\`)` },
                    { name: '💬 무슨 말을 했는지', value: `\`\`\`${message.content}\`\`\`` }
                )
                .setTimestamp();

            if (warnChannel) {
                await warnChannel.send({ embeds: [warnEmbed] });
            } else {
                await message.channel.send({ content: `⚠️ <@${message.author.id}>님, 금지어 사용으로 경고 1회 누적 및 30분간 타임아웃 처리되었습니다.`, embeds: [warnEmbed] });
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
            const isSubOwner = interaction.member.roles.cache.some(role => role.id === '1098970312722366505' || role.id === '1146079297128370317');

            if (!isOwner && !isSubOwner) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 부서버장만 사용할 수 있습니다.', ephemeral: true });
            }

            await interaction.reply(`📊 현재 서버의 총 인원수는 **${interaction.guild.memberCount}명**입니다!`);
            break;
        }

        case '킥': {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const isSubOwner = interaction.member.roles.cache.some(role => role.id === '1098970312722366505' || role.id === '1146079297128370317');

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
            const hasPermissionRole = interaction.member.roles.cache.some(role => role.id === '1146079297128370317' || role.id === '1098970312722366505');

            if (!isOwner && !hasPermissionRole) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 관리자/부관리자님만 사용할 수 있습니다!', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('대상');
            const targetMember = interaction.options.getMember('대상'); 
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

            // ⏱️ 타임아웃 문자열 인식 및 ms 변환 로직 (1분부터 28일까지 확장 지원)
            let duration = 0;
            if (actionTaken.includes('분')) duration = parseInt(actionTaken) * 60 * 1000;
            else if (actionTaken.includes('시간')) duration = parseInt(actionTaken) * 60 * 60 * 1000;
            else if (actionTaken === '하루 타임아웃') duration = 24 * 60 * 60 * 1000;
            else if (actionTaken === '이틀 타임아웃') duration = 48 * 60 * 60 * 1000;
            else if (actionTaken === '사흘 타임아웃') duration = 72 * 60 * 60 * 1000;
            else if (actionTaken === '나흘 타임아웃') duration = 96 * 60 * 60 * 1000;
            else if (actionTaken.includes('일 타임아웃')) duration = parseInt(actionTaken) * 24 * 60 * 60 * 1000;

            let realActionText = `**${actionTaken}**`;

            if (targetMember) {
                if (duration > 0 && targetMember.moderatable) {
                    await targetMember.timeout(duration, `관리자 수동 제재: ${reason}`).catch(console.error);
                } else if (actionTaken === '서버 추방 (킥)' && targetMember.kickable) {
                    await targetMember.kick(`관리자 수동 제재: ${reason}`).catch(console.error);
                    realActionText = '🔥 **서버 추방 (킥) 완료**';
                } else if (actionTaken === '서버 차단 (밴)' && targetMember.bannable) {
                    await targetMember.ban({ reason: `관리자 수동 제재: ${reason}` }).catch(console.error);
                    realActionText = '🚫 **서버 영구 차단 (밴) 완료**';
                }
            }

            const warnChannel = interaction.guild.channels.cache.find(ch => ch.name === '경고-로그');
            
            const manualEmbed = new EmbedBuilder()
                .setTitle('⚠️ [수동 제재] 관리자 경고')
                .setColor(0xFFCC00)
                .addFields(
                    { name: '👤 시행자', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🎯 대상자', value: `<@${targetUser.id}>`, inline: true },
                    { name: '📊 누적 경고 수', value: `**${finalCount}회**`, inline: true },
                    { name: '⏳ 조치 사항', value: realActionText, inline: true },
                    { name: '📝 경고 이유', value: reason },
                    { name: '💬 무슨 말을 했는지', value: `\`\`\`${whatTheySaid}\`\`\`` }
                )
                .setTimestamp();

            if (warnChannel) {
                await warnChannel.send({ embeds: [manualEmbed] }).catch(() => {});
            }

            await interaction.reply({ content: `🚨 <@${targetUser.id}>님에게 수동 경고 조치를 완료했습니다.`, embeds: [manualEmbed] });
            break;
        }

        case '경고차감': {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const hasPermissionRole = interaction.member.roles.cache.some(role => role.id === '1146079297128370317' || role.id === '1098970312722366505');

            if (!isOwner && !hasPermissionRole) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 관리자/부관리자님만 사용할 수 있습니다!', ephemeral: true });
            }

            const targetUser = interaction.options.getUser('대상');
            const reduceAmount = interaction.options.getInteger('차감수');
            const reason = interaction.options.getString('사유');

            if (reduceAmount <= 0) {
                return await interaction.reply({ content: '❌ 차감할 경고 수는 1개 이상이어야 합니다.', ephemeral: true });
            }

            let userData = await Warning.findOne({ guildId: interaction.guild.id, userId: targetUser.id });
            let beforeCount = userData ? userData.count : 0;
            let afterCount = Math.max(0, beforeCount - reduceAmount);

            userData = await Warning.findOneAndUpdate(
                { guildId: interaction.guild.id, userId: targetUser.id },
                { count: afterCount },
                { upsert: true, new: true }
            );

            const warnChannel = interaction.guild.channels.cache.find(ch => ch.name === '경고-로그');

            // ✨ 필드 명칭을 [시행자] 와 [대상자] 로 깔끔하게 변환 완료
            const deductEmbed = new EmbedBuilder()
                .setTitle('🟢 [경고 차감] 관리자 면제 조치')
                .setColor(0x00FF00)
                .addFields(
                    { name: '👤 시행자', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '🎯 대상자', value: `<@${targetUser.id}>`, inline: true },
                    { name: '📊 경고 변동 사항', value: `**${beforeCount}회 ➡️ ${userData.count}회** (\`-${reduceAmount}\`)`, inline: true },
                    { name: '📝 차감 사유', value: reason }
                )
                .setTimestamp();

            if (warnChannel) {
                await warnChannel.send({ embeds: [deductEmbed] }).catch(() => {});
            }

            await interaction.reply({ content: `✅ <@${targetUser.id}>님의 경고를 차감하였습니다.`, embeds: [deductEmbed] });
            break;
        }

        case '경고한도': {
            const isOwner = interaction.guild.ownerId === interaction.user.id;
            const hasPermissionRole = interaction.member.roles.cache.some(role => role.id === '1146079297128370317' || role.id === '1098970312722366505');

            if (!isOwner && !hasPermissionRole) {
                return await interaction.reply({ content: '❌ 이 명령어는 서버장과 관리자/부관리자님만 사용할 수 있습니다!', ephemeral: true });
            }

            const newLimit = interaction.options.getInteger('설정값');

            if (newLimit === null) {
                const settings = await GuildSettings.findOne({ guildId: interaction.guild.id });
                const currentLimit = settings ? settings.maxWarnings : 5;

                const infoEmbed = new EmbedBuilder()
                    .setTitle('⚙️ 서버 경고 한도 정보')
                    .setColor(0x3498DB)
                    .setDescription(`현재 이 서버의 최대 누적 경고 제한 수치는 **${currentLimit}회**입니다.\n이 횟수 이상 경고가 쌓인 유저는 금지어 사용 시 자동으로 추방(킥) 처리됩니다.`)
                    .setTimestamp();

                return await interaction.reply({ embeds: [infoEmbed] });
            }

            if (newLimit <= 0) {
                return await interaction.reply({ content: '❌ 경고 제한 한도는 최소 1 이상이어야 합니다.', ephemeral: true });
            }

            const updatedSettings = await GuildSettings.findOneAndUpdate(
                { guildId: interaction.guild.id },
                { maxWarnings: newLimit },
                { upsert: true, new: true }
            );

            const settingsEmbed = new EmbedBuilder()
                .setTitle('🔧 서버 경고 한도 변경 완료')
                .setColor(0xE67E22)
                .addFields(
                    { name: '👤 변경자', value: `<@${interaction.user.id}>`, inline: true },
                    { name: '📈 변경된 경고 한도', value: `**${updatedSettings.maxWarnings}회**`, inline: true }
                )
                .setDescription(`이제부터 유저가 금지어 등으로 경고를 받아 누적 경고 수가 **${updatedSettings.maxWarnings}회**에 도달하면 즉시 자동으로 서버에서 추방(킥)됩니다.`)
                .setTimestamp();

            await interaction.reply({ embeds: [settingsEmbed] });
            break;
        }
    }
});

client.login(process.env.DISCORD_TOKEN);
