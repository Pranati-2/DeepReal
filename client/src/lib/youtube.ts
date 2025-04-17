import { getTranscript } from 'youtube-transcript-api';
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

// Get transcript of YouTube video
export async function getYouTubeTranscript(videoId: string): Promise<string> {
  try {
    const transcript = await getTranscript(videoId);
    
    // Combine all transcript parts into a single text
    return transcript.map(part => part.text).join(' ');
  } catch (error) {
    console.error('Error fetching transcript:', error);
    throw new Error('Failed to get video transcript. The video might not have captions available.');
  }
}

// Extract key topics from transcript
export function extractTopicsFromTranscript(transcript: string): string[] {
  // Use compromise to extract nouns and important topics
  const doc = nlp(transcript);
  
  // Extract named entities, people, and organizations
  const people = doc.people().out('array');
  const places = doc.places().out('array');
  const organizations = doc.organizations().out('array');
  
  // Extract other important nouns
  const nouns = doc.nouns().out('array');
  
  // Combine all topics and filter out duplicates
  const allTopics = [...people, ...places, ...organizations, ...nouns];
  const uniqueTopics = [...new Set(allTopics)];
  
  // Sort by length (longer topics are usually more specific and relevant)
  return uniqueTopics
    .filter(topic => topic.length > 3) // Filter out very short topics
    .sort((a, b) => b.length - a.length)
    .slice(0, 10); // Return top 10 topics
}

// Generate a summary of the video based on transcript
export function generateVideoSummary(transcript: string): string {
  // In a full implementation, this would use an LLM API
  // For now, we'll use a simple approach of extracting sentences
  
  const doc = nlp(transcript);
  const sentences = doc.sentences().out('array');
  
  // Heuristic: Extract sentences that contain important topics
  const topics = extractTopicsFromTranscript(transcript);
  
  // Find sentences that mention key topics
  const relevantSentences = sentences.filter(sentence => {
    const sentenceLower = sentence.toLowerCase();
    return topics.some(topic => sentenceLower.includes(topic.toLowerCase()));
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
  const questionTopics = questionDoc.nouns().out('array');
  
  // Extract potential question words
  const isWhatQuestion = userQuestion.toLowerCase().includes('what');
  const isWhoQuestion = userQuestion.toLowerCase().includes('who');
  const isWhereQuestion = userQuestion.toLowerCase().includes('where');
  const isWhenQuestion = userQuestion.toLowerCase().includes('when');
  const isWhyQuestion = userQuestion.toLowerCase().includes('why');
  const isHowQuestion = userQuestion.toLowerCase().includes('how');
  
  // Find relevant parts of the transcript
  const doc = nlp(transcript);
  const sentences = doc.sentences().out('array');
  
  // Find sentences that contain question topics
  const relevantSentences = sentences.filter(sentence => {
    const sentenceLower = sentence.toLowerCase();
    return questionTopics.some(topic => sentenceLower.includes(topic.toLowerCase()));
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
    const peopleMentioned = nlp(relevantSentences.join(' ')).people().out('array');
    if (peopleMentioned.length > 0) {
      return `The video mentions ${peopleMentioned.join(', ')} in relation to your question. Specifically, ${relevantSentences[0]}`;
    }
  } else if (isWhereQuestion) {
    // Try to find places mentioned
    const placesMentioned = nlp(relevantSentences.join(' ')).places().out('array');
    if (placesMentioned.length > 0) {
      return `The video refers to ${placesMentioned.join(', ')} when discussing this topic. ${relevantSentences[0]}`;
    }
  }
  
  // Default response with relevant information
  return `From what I gathered in the video: ${relevantSentences.slice(0, 3).join(' ')}`;
}