import axios from 'axios';
import { Prospect, IntentParsingResult } from '../types';

export async function searchApolloProspects(prompt: string, intent: IntentParsingResult): Promise<Prospect[]> {
  try {
    const response = await axios.post('/api/prospects/search', {
      prompt,
      filters: intent.filters
    });

    const data = response.data;
    
    // Transform Apollo data to our Prospect interface
    // Note: Adjust mapping based on actual Apollo response structure
    return (data.people || []).map((person: any, index: number) => ({
      id: person.id || `apollo-${index}`,
      companyName: person.organization?.name || 'Unknown Company',
      website: person.organization?.website_url || '#',
      contactName: `${person.first_name} ${person.last_name}`,
      title: person.title || 'Unknown Title',
      email: person.email || 'Contact for email',
      region: person.state || person.country || 'Unknown Region',
      industry: person.organization?.industry || 'Unknown Industry',
      opportunitySignal: 'Identified via Apollo Search',
      recentTriggerEvent: person.organization?.latest_funding_announcement_date ? `Latest funding: ${person.organization?.latest_funding_announcement_date}` : 'Established player in sector',
      whyFit: `Matches criteria for ${intent.filters.companyType || 'prospect'} targeting in ${intent.filters.region || 'requested region'}.`,
    }));
  } catch (error) {
    console.error('Error fetching from Apollo:', error);
    throw error;
  }
}
