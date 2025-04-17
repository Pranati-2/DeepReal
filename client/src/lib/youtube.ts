import nlp from 'compromise';

// Extract YouTube video ID from different URL formats
export function extractYouTubeVideoId(url: string): string | null {
  // Regular expression to match YouTube video IDs in various URL formats
  const regex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(regex);
  
  return match && match[1] ? match[1] : null;
}

// Get video information including title and thumbnail
export async function getVideoInfo(videoId: string): Promise<{
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  publishedAt: string;
}> {
  try {
    // Use the YouTube oEmbed API to get basic video info
    const response = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch video information');
    }
    
    const data = await response.json();
    
    return {
      title: data.title || 'Unknown Title',
      thumbnailUrl: data.thumbnail_url || '',
      channelTitle: data.author_name || 'Unknown Channel',
      publishedAt: 'Unknown Date' // oEmbed doesn't provide publish date
    };
  } catch (error) {
    console.error('Error fetching video info:', error);
    return {
      title: 'Video Information Unavailable',
      thumbnailUrl: '',
      channelTitle: 'Unknown',
      publishedAt: 'Unknown'
    };
  }
}

// Get a simulated transcript for a YouTube video
// Note: In a real implementation, this would use YouTube's API or another method
// to get actual transcripts. For this demo, we'll generate a simulated transcript.
export async function getYouTubeTranscript(videoId: string): Promise<string> {
  // First, try to get video title and other metadata
  try {
    const { title } = await getVideoInfo(videoId);
    
    // Generate a simulated transcript based on the video title
    // This is just for demo purposes; in a real app, we'd use real transcripts
    const titleWords = title.split(' ');
    const topics = titleWords
      .filter(word => word.length > 3)
      .map(word => word.replace(/[^\w\s]/gi, ''))
      .filter(word => word.length > 0);
      
    // Generate some sentences using the title words
    const sentences = [
      `This video explores the topic of ${title}.`,
      `The main points discussed include ${topics.slice(0, 3).join(', ')}.`,
      `The presenter explains how ${topics[0]} relates to various concepts.`,
      `There's a detailed analysis of ${topics[1] || 'the subject'} and its importance.`,
      `Various examples are provided to illustrate ${topics[0] || 'the concepts'}.`,
      `The video concludes with thoughts on future developments in this area.`
    ];
    
    return sentences.join(' ');
  } catch (error) {
    console.error('Error generating transcript:', error);
    throw new Error('Failed to generate video transcript.');
  }
}

// Extract key topics from transcript
export function extractTopicsFromTranscript(transcript: string): string[] {
  // Use compromise to extract nouns and important topics
  const doc = nlp(transcript);
  
  // Extract named entities, people, and organizations
  const people = doc.people().out('array') as string[];
  const places = doc.places().out('array') as string[];
  const organizations = doc.organizations().out('array') as string[];
  
  // Extract other important nouns
  const nouns = doc.nouns().out('array') as string[];
  
  // Combine all topics and filter out duplicates
  const allTopics = [...people, ...places, ...organizations, ...nouns];
  const uniqueTopicsSet = new Set<string>(allTopics);
  
  // Convert set back to array
  const uniqueTopics = Array.from(uniqueTopicsSet);
  
  // Sort by length (longer topics are usually more specific and relevant)
  return uniqueTopics
    .filter((topic: string) => topic.length > 3) // Filter out very short topics
    .sort((a: string, b: string) => b.length - a.length)
    .slice(0, 10); // Return top 10 topics
}

// Generate a summary of the video based on transcript
export function generateVideoSummary(transcript: string): string {
  // In a full implementation, this would use an LLM API
  // For now, we'll use a simple approach of extracting sentences
  
  const doc = nlp(transcript);
  const sentences = doc.sentences().out('array') as string[];
  
  // Heuristic: Extract sentences that contain important topics
  const topics = extractTopicsFromTranscript(transcript);
  
  // Find sentences that mention key topics
  const relevantSentences = sentences.filter((sentence: string) => {
    const sentenceLower = sentence.toLowerCase();
    return topics.some((topic: string) => sentenceLower.includes(topic.toLowerCase()));
  });
  
  // Return up to 5 sentences as a summary
  return relevantSentences.slice(0, 5).join(' ');
}

// Generate a contextual response about the video content
export function generateVideoContentResponse(
  transcript: string, 
  userQuestion: string
): string {
  // Use compromise to analyze user question
  const questionDoc = nlp(userQuestion);
  
  // Extract key nouns from the question
  const questionTopics = questionDoc.nouns().out('array') as string[];
  
  // Extract potential question words
  const isWhatQuestion = userQuestion.toLowerCase().includes('what');
  const isWhoQuestion = userQuestion.toLowerCase().includes('who');
  const isWhereQuestion = userQuestion.toLowerCase().includes('where');
  const isWhenQuestion = userQuestion.toLowerCase().includes('when');
  const isWhyQuestion = userQuestion.toLowerCase().includes('why');
  const isHowQuestion = userQuestion.toLowerCase().includes('how');
  
  // Find relevant parts of the transcript
  const doc = nlp(transcript);
  const sentences = doc.sentences().out('array') as string[];
  
  // Find sentences that contain question topics
  const relevantSentences = sentences.filter((sentence: string) => {
    const sentenceLower = sentence.toLowerCase();
    return questionTopics.some((topic: string) => sentenceLower.includes(topic.toLowerCase()));
  });
  
  // If no relevant sentences found
  if (relevantSentences.length === 0) {
    return "I couldn't find specific information about that in the video. Would you like to know about a different aspect of the content?";
  }
  
  // Construct a response based on question type
  if (isWhatQuestion) {
    return `Based on the video, ${relevantSentences.slice(0, 2).join(' ')}`;
  } else if (isWhoQuestion) {
    // Try to find people mentioned
    const peopleMentioned = nlp(relevantSentences.join(' ')).people().out('array') as string[];
    if (peopleMentioned.length > 0) {
      return `The video mentions ${peopleMentioned.join(', ')} in relation to your question. Specifically, ${relevantSentences[0]}`;
    }
  } else if (isWhereQuestion) {
    // Try to find places mentioned
    const placesMentioned = nlp(relevantSentences.join(' ')).places().out('array') as string[];
    if (placesMentioned.length > 0) {
      return `The video refers to ${placesMentioned.join(', ')} when discussing this topic. ${relevantSentences[0]}`;
    }
  }
  
  // Default response with relevant information
  return `From what I gathered in the video: ${relevantSentences.slice(0, 3).join(' ')}`;
}