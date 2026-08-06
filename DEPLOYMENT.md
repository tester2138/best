# Deployment Checklist

## Pre-Deployment

- [x] Database schema created and indexed
- [x] API endpoints functional and tested
- [x] Frontend pages updated with dynamic data fetching
- [x] Error handling and loading states implemented
- [x] SEO metadata configured
- [x] Sample posts seeded and verified

## Environment Variables (Vercel)

Required environment variables should be set in your Vercel project settings:

```
DATABASE_URL=postgresql://...
```

This is automatically set when you connect Neon to your Vercel project.

## Deployment Steps

### 1. Connect Repository
- Push code to GitHub
- Connect repository to Vercel project

### 2. Set Environment Variables
- Go to Vercel Project Settings → Environment Variables
- Ensure `DATABASE_URL` is set (from Neon integration)
- Verify all other required variables are present

### 3. Deploy
```bash
# Automatic deployment on push
git push origin main
```

Or use Vercel CLI:
```bash
vercel deploy
```

### 4. Verify Deployment
- Visit `/news` page
- Check that posts load
- Test API endpoints:
  - `https://yoursite.com/api/posts`
  - `https://yoursite.com/api/search?q=test`
  - `https://yoursite.com/api/featured`

## Post-Deployment

### Seed Database (First Time)
```bash
curl -X POST https://yoursite.com/api/admin/seed
```

### Verify Everything Works
1. Homepage news section displays posts
2. Individual post pages render correctly
3. Search functionality works
4. Newsletter signup works
5. API endpoints return proper JSON

## Monitoring

### Check Logs
```bash
vercel logs --prod
```

### Monitor Database
- Log into Neon console
- Check query performance
- Monitor connection usage

### Performance Metrics
- Monitor API response times
- Track page load times
- Check error rates

## Troubleshooting Deployment

### Posts Not Appearing
1. Check that database was seeded:
   ```bash
   curl -X POST https://yoursite.com/api/admin/seed
   ```
2. Verify DATABASE_URL is set:
   ```bash
   curl https://yoursite.com/api/posts
   ```

### API Errors (500)
1. Check Vercel logs: `vercel logs --prod`
2. Verify DATABASE_URL in environment
3. Check Neon database is active

### Slow Performance
1. Check database indexes are created
2. Verify Neon plan has sufficient resources
3. Consider adding caching layer (Redis)

## Maintenance

### Regular Tasks
- Monitor database size growth
- Clean up old posts if needed
- Review error logs weekly
- Test backup restore process

### Updates
- Update dependencies monthly
- Apply security patches immediately
- Test updates in preview environment first

### Scaling
- Monitor query performance
- Add caching if needed
- Consider read replicas for high traffic

## Rollback Procedure

If something goes wrong:

1. **Quick rollback to previous build:**
   ```bash
   vercel rollback
   ```

2. **Manual rollback to specific deployment:**
   - Go to Vercel Dashboard
   - Find the working deployment
   - Click "Promote to Production"

3. **Data recovery:**
   - Neon automatically keeps backups
   - Contact Neon support if data recovery needed

## Support Resources

- **Neon Docs**: https://neon.tech/docs
- **Vercel Docs**: https://vercel.com/docs
- **Next.js Docs**: https://nextjs.org/docs
- **Database Issues**: Check Neon status page
- **Performance**: Use Vercel Analytics
