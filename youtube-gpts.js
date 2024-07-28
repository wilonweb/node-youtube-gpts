const fs = require("fs");
const ytdl = require("ytdl-core");
const { YoutubeTranscript } = require("youtube-transcript");
const path = require("path");

// Récupérer l'argument de ligne de commande
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error("Veuillez fournir une URL de vidéo YouTube en argument.");
  process.exit(1); // Terminer le script avec un code d'erreur
}

const videoUrl = args[0];
const videoIdMatch = videoUrl.match(/v=([a-zA-Z0-9_-]{11})/);
if (!videoIdMatch) {
  console.error("L'URL fournie n'est pas valide.");
  process.exit(1); // Terminer le script avec un code d'erreur
}

const videoId = videoIdMatch[1];

// Fonction pour obtenir la transcription
async function fetchTranscript(videoId) {
  const transcriptResult = await YoutubeTranscript.fetchTranscript(videoId);
  console.log("Transcript:", transcriptResult); // Vérifiez le contenu de la transcription
  return transcriptResult;
}

// Fonction pour obtenir les chapitres
async function fetchChapters(videoUrl) {
  const info = await ytdl.getInfo(videoUrl);
  const chapters = info.videoDetails.chapters || []; // Gérer les vidéos sans chapitres
  console.log("Chapters:", chapters); // Vérifiez les chapitres
  return chapters.map((chapter) => ({
    title: chapter.title,
    start_time: chapter.start_time,
  }));
}

// Fonction pour diviser la transcription en chapitres
function splitTranscriptByChapters(transcript, chapters) {
  if (chapters.length === 0) {
    return { "No Chapters": transcript.map((entry) => entry.text).join(" ") };
  }

  const chaptersText = chapters.reduce((acc, chapter) => {
    acc[chapter.title] = "";
    return acc;
  }, {});

  let currentChapterIndex = 0;

  transcript.forEach((entry) => {
    const startTime = entry.offset; // Assurez-vous que le temps est en secondes
    while (
      currentChapterIndex < chapters.length - 1 &&
      startTime >= chapters[currentChapterIndex + 1].start_time
    ) {
      currentChapterIndex++;
    }
    const currentChapterTitle = chapters[currentChapterIndex].title;
    chaptersText[currentChapterTitle] += entry.text + " ";
  });

  console.log("Chapters Text:", chaptersText); // Vérifiez le contenu des chapitres
  return chaptersText;
}

// Fonction pour sauvegarder chaque chapitre dans un fichier
function saveChaptersToFiles(chaptersText, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  Object.entries(chaptersText).forEach(([title, text], index) => {
    const chapterNumber = index + 1;
    const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const fileName = `${chapterNumber
      .toString()
      .padStart(2, "0")}_${safeTitle}.txt`;
    const filePath = path.join(outputDir, fileName);
    fs.writeFileSync(filePath, text, "utf8");
  });
}

// Nouvelle fonction pour sauvegarder la transcription entière dans un fichier
function saveEntireTranscript(transcript, videoTitle, outputDir) {
  const entireTranscriptText = transcript.map((entry) => entry.text).join(" ");
  const safeTitle = videoTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
  const fileName = `original_${safeTitle}.txt`;
  const filePath = path.join(outputDir, fileName);
  fs.writeFileSync(filePath, entireTranscriptText, "utf8");
}

// Exécution du script
(async () => {
  try {
    const info = await ytdl.getInfo(videoUrl);
    const videoTitle = info.videoDetails.title; // Récupérer le titre de la vidéo
    const safeVideoTitle = videoTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase();
    const outputDir = path.join("v1-download", safeVideoTitle); // Utiliser le titre comme nom du répertoire de sortie
    const transcript = await fetchTranscript(videoId);
    const chapters = await fetchChapters(videoUrl);
    const chaptersText = splitTranscriptByChapters(transcript, chapters);
    saveChaptersToFiles(chaptersText, outputDir);
    saveEntireTranscript(transcript, videoTitle, outputDir); // Sauvegarder la transcription entière
    console.log(
      "Transcriptions par chapitres et la transcription entière sauvegardées avec succès dans le répertoire:",
      outputDir
    );
  } catch (error) {
    console.error("Erreur lors du traitement:", error);
  }
})();
