export const environment = {
    production: true,
    apiUrlUsuarios: 'https://localhost:7014/api',
    //apiUrl: 'https://main.egasyasociados.com:4040/api',
    //apiUrl2: 'https://main.egasyasociados.com:4040/api/geocercas',
    //apiUrl: 'https://app.emporioecuador.com.ec:8050/api',
    //apiUrl2: 'https://app.emporioecuador.com.ec:8050/api/geocercas',
    //apiUrl: 'https://main.egasyasociados.com:4041/api',
    //apiUrl2: 'https://main.egasyasociados.com:4041/api/geocercas',
    
    //apiUrl: '${EGASTAMAYO_URL}',
    //apiUrl2: '${EGASTAMAYO_URL}'+'/geocercas',
    
  apiUrl: (window as any).__env?.apiUrl || '',
  apiUrl2: (window as any).__env?.apiUrl2 || '',
};
