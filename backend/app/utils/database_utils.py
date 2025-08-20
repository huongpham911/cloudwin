"""
Database utilities for WinCloud Builder
Provides SQLAlchemy optimization and monitoring tools
"""

import logging
import time
from typing import Dict, List, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect, MetaData
from sqlalchemy.engine import Engine
from app.core.database import engine

logger = logging.getLogger(__name__)

class DatabaseOptimizer:
    """
    Database optimization and monitoring utilities
    """
    
    def __init__(self, engine: Engine):
        self.engine = engine
        self.metadata = MetaData()
        self.metadata.reflect(bind=engine)
    
    def get_database_health(self, db: Session) -> Dict[str, Any]:
        """
        Comprehensive database health check
        
        Returns:
            Database health metrics
        """
        health_data = {
            "status": "unknown",
            "connection_pool": {},
            "table_stats": {},
            "performance": {},
            "recommendations": []
        }
        
        try:
            # Test basic connectivity
            start_time = time.time()
            db.execute(text("SELECT 1"))
            connection_time = time.time() - start_time
            
            health_data["status"] = "healthy"
            health_data["performance"]["connection_test_ms"] = round(connection_time * 1000, 2)
            
            # Connection pool status
            pool = self.engine.pool
            health_data["connection_pool"] = {
                "pool_size": pool.size(),
                "checked_out_connections": pool.checkedout(),
                "overflow_connections": pool.overflow(),
                "invalid_connections": pool.invalidated()
            }
            
            # Table statistics
            health_data["table_stats"] = self._get_table_statistics(db)
            
            # Performance analysis
            health_data["performance"].update(self._analyze_performance(db))
            
            # Generate recommendations
            health_data["recommendations"] = self._generate_recommendations(health_data)
            
        except Exception as e:
            health_data["status"] = "unhealthy"
            health_data["error"] = str(e)
            logger.error(f"Database health check failed: {e}")
        
        return health_data
    
    def _get_table_statistics(self, db: Session) -> Dict[str, Any]:
        """Get statistics for all tables"""
        stats = {}
        
        try:
            # Get table names
            tables = [
                "users", "droplets", "user_sessions", "audit_logs",
                "droplet_regions", "droplet_sizes", "build_progress"
            ]
            
            for table in tables:
                try:
                    # Get row count
                    result = db.execute(text(f"SELECT COUNT(*) FROM {table}"))
                    count = result.scalar()
                    stats[table] = {"row_count": count}
                    
                    # Get table size (PostgreSQL specific)
                    if self.engine.url.drivername.startswith('postgresql'):
                        size_result = db.execute(text(f"""
                            SELECT pg_size_pretty(pg_total_relation_size('{table}'))
                        """))
                        size = size_result.scalar()
                        stats[table]["size"] = size
                        
                except Exception as e:
                    stats[table] = {"error": str(e)}
                    
        except Exception as e:
            logger.error(f"Error getting table statistics: {e}")
            
        return stats
    
    def _analyze_performance(self, db: Session) -> Dict[str, Any]:
        """Analyze database performance metrics"""
        performance = {}
        
        try:
            # Test query performance
            queries = [
                ("simple_select", "SELECT COUNT(*) FROM users"),
                ("complex_join", """
                    SELECT u.username, COUNT(d.id) as droplet_count 
                    FROM users u 
                    LEFT JOIN droplets d ON u.id = d.user_id 
                    GROUP BY u.id, u.username 
                    LIMIT 10
                """),
                ("filtered_query", """
                    SELECT * FROM droplets 
                    WHERE status = 'active' 
                    AND created_at > NOW() - INTERVAL '7 days' 
                    LIMIT 5
                """)
            ]
            
            for name, query in queries:
                start_time = time.time()
                try:
                    db.execute(text(query))
                    duration = time.time() - start_time
                    performance[f"{name}_ms"] = round(duration * 1000, 2)
                except Exception as e:
                    performance[f"{name}_error"] = str(e)
            
            # Get database-specific performance metrics
            if self.engine.url.drivername.startswith('postgresql'):
                performance.update(self._get_postgresql_metrics(db))
                
        except Exception as e:
            logger.error(f"Error analyzing performance: {e}")
            
        return performance
    
    def _get_postgresql_metrics(self, db: Session) -> Dict[str, Any]:
        """Get PostgreSQL-specific performance metrics"""
        metrics = {}
        
        try:
            # Cache hit ratio
            cache_hit_result = db.execute(text("""
                SELECT 
                    round(
                        (sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read))) * 100, 2
                    ) as cache_hit_ratio
                FROM pg_statio_user_tables
            """))
            cache_hit = cache_hit_result.scalar()
            if cache_hit:
                metrics["cache_hit_ratio_percent"] = float(cache_hit)
            
            # Index usage
            index_usage_result = db.execute(text("""
                SELECT 
                    schemaname,
                    tablename,
                    attname,
                    n_distinct,
                    correlation
                FROM pg_stats 
                WHERE schemaname = 'public'
                LIMIT 5
            """))
            
            # Active connections
            connections_result = db.execute(text("""
                SELECT count(*) as active_connections
                FROM pg_stat_activity 
                WHERE state = 'active'
            """))
            active_connections = connections_result.scalar()
            metrics["active_connections"] = active_connections
            
        except Exception as e:
            logger.error(f"Error getting PostgreSQL metrics: {e}")
            
        return metrics
    
    def _generate_recommendations(self, health_data: Dict[str, Any]) -> List[str]:
        """Generate optimization recommendations based on health data"""
        recommendations = []
        
        try:
            # Connection pool recommendations
            pool_data = health_data.get("connection_pool", {})
            checked_out = pool_data.get("checked_out_connections", 0)
            pool_size = pool_data.get("pool_size", 0)
            
            if pool_size > 0 and checked_out / pool_size > 0.8:
                recommendations.append("Consider increasing connection pool size")
            
            # Performance recommendations
            performance = health_data.get("performance", {})
            
            if performance.get("connection_test_ms", 0) > 100:
                recommendations.append("Database connection latency is high")
            
            if performance.get("complex_join_ms", 0) > 1000:
                recommendations.append("Consider optimizing complex join queries")
            
            # Cache hit ratio (PostgreSQL)
            cache_hit_ratio = performance.get("cache_hit_ratio_percent", 100)
            if cache_hit_ratio < 95:
                recommendations.append("Database cache hit ratio is low - consider increasing shared_buffers")
            
            # Table size recommendations
            table_stats = health_data.get("table_stats", {})
            for table, stats in table_stats.items():
                row_count = stats.get("row_count", 0)
                if row_count > 100000:
                    recommendations.append(f"Table '{table}' has {row_count:,} rows - consider partitioning or archiving")
            
            if not recommendations:
                recommendations.append("Database performance looks good!")
                
        except Exception as e:
            logger.error(f"Error generating recommendations: {e}")
            recommendations.append("Unable to generate recommendations due to error")
        
        return recommendations
    
    def suggest_indexes(self, db: Session) -> List[Dict[str, Any]]:
        """
        Suggest missing indexes based on common query patterns
        """
        suggestions = []
        
        # Common index suggestions for WinCloud Builder
        index_suggestions = [
            {
                "table": "droplets",
                "columns": ["user_id", "status"],
                "reason": "Optimize user droplet filtering by status"
            },
            {
                "table": "droplets", 
                "columns": ["created_at"],
                "reason": "Optimize time-based queries"
            },
            {
                "table": "users",
                "columns": ["email", "is_active"],
                "reason": "Optimize login queries"
            },
            {
                "table": "audit_logs",
                "columns": ["user_id", "created_at"],
                "reason": "Optimize audit log queries"
            },
            {
                "table": "user_sessions",
                "columns": ["jti"],
                "reason": "Optimize JWT token lookups"
            }
        ]
        
        try:
            # Check which indexes already exist
            existing_indexes = self._get_existing_indexes(db)
            
            for suggestion in index_suggestions:
                table = suggestion["table"]
                columns = suggestion["columns"]
                
                # Check if similar index exists
                index_name = f"idx_{table}_{'_'.join(columns)}"
                
                if not self._index_exists(existing_indexes, table, columns):
                    suggestions.append({
                        **suggestion,
                        "suggested_name": index_name,
                        "sql": f"CREATE INDEX {index_name} ON {table} ({', '.join(columns)});"
                    })
                    
        except Exception as e:
            logger.error(f"Error suggesting indexes: {e}")
        
        return suggestions
    
    def _get_existing_indexes(self, db: Session) -> Dict[str, List[str]]:
        """Get existing indexes for each table"""
        indexes = {}
        
        try:
            if self.engine.url.drivername.startswith('postgresql'):
                result = db.execute(text("""
                    SELECT 
                        tablename,
                        indexname,
                        indexdef
                    FROM pg_indexes 
                    WHERE schemaname = 'public'
                """))
                
                for row in result:
                    table = row.tablename
                    if table not in indexes:
                        indexes[table] = []
                    indexes[table].append(row.indexname)
                    
        except Exception as e:
            logger.error(f"Error getting existing indexes: {e}")
        
        return indexes
    
    def _index_exists(self, existing_indexes: Dict, table: str, columns: List[str]) -> bool:
        """Check if an index on specified columns exists"""
        if table not in existing_indexes:
            return False
        
        # Simple check - look for index names containing the columns
        column_str = "_".join(columns)
        for index_name in existing_indexes[table]:
            if column_str in index_name.lower():
                return True
        
        return False
    
    def analyze_slow_queries(self, db: Session, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Analyze slow queries (PostgreSQL specific)
        Requires pg_stat_statements extension
        """
        slow_queries = []
        
        try:
            if not self.engine.url.drivername.startswith('postgresql'):
                return [{"note": "Slow query analysis only available for PostgreSQL"}]
            
            # Check if pg_stat_statements is available
            extension_check = db.execute(text("""
                SELECT EXISTS(
                    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
                )
            """)).scalar()
            
            if not extension_check:
                return [{"note": "pg_stat_statements extension not available"}]
            
            # Get slow queries
            result = db.execute(text(f"""
                SELECT 
                    query,
                    calls,
                    total_time,
                    mean_time,
                    rows
                FROM pg_stat_statements 
                ORDER BY total_time DESC 
                LIMIT {limit}
            """))
            
            for row in result:
                slow_queries.append({
                    "query": row.query[:200] + "..." if len(row.query) > 200 else row.query,
                    "calls": row.calls,
                    "total_time_ms": round(row.total_time, 2),
                    "mean_time_ms": round(row.mean_time, 2),
                    "avg_rows": row.rows // row.calls if row.calls > 0 else 0
                })
                
        except Exception as e:
            logger.error(f"Error analyzing slow queries: {e}")
            slow_queries.append({"error": str(e)})
        
        return slow_queries

# Global optimizer instance
db_optimizer = DatabaseOptimizer(engine)
