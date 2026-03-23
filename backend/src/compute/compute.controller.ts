import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ComputeService } from './compute.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LaunchSessionDto, RestartSessionDto } from './compute.dto';

@Controller('api/compute')
@UseGuards(JwtAuthGuard)
export class ComputeController {
  constructor(private readonly computeService: ComputeService) {}

  // ============================================================================
  // USER ENDPOINTS
  // ============================================================================

  /**
   * Get all compute configurations with current availability
   * Returns configs sorted by sortOrder with available flag and maxLaunchable count
   */
  @Get('configs')
  async getConfigs() {
    return this.computeService.getConfigsWithAvailability();
  }

  /**
   * Get current resource usage summary
   * Returns total, used, and available resources
   */
  @Get('resources/usage')
  async getResourceUsage() {
    return this.computeService.getResourceUsage();
  }

  /**
   * Launch a new compute session
   * Validates resources, wallet balance, and storage requirements
   * Uses serializable transaction to prevent double-allocation
   */
  @Post('sessions')
  @HttpCode(HttpStatus.CREATED)
  async launchSession(
    @Req() req: { user: { id: string } },
    @Body() dto: LaunchSessionDto,
  ) {
    const userId = req.user.id;
    return this.computeService.launchSession(userId, dto);
  }

  /**
   * Get all sessions for the authenticated user
   * Includes computed uptime and cost-so-far for running sessions
   */
  @Get('sessions')
  async getUserSessions(@Req() req: { user: { id: string } }) {
    const userId = req.user.id;
    return this.computeService.getUserSessions(userId);
  }

  /**
   * Get detailed information about a specific session
   * Includes wallet holds, billing charges, and resource reservation
   */
  @Get('sessions/:id')
  async getSessionDetail(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionDetail(userId, id);
  }

  /**
   * Terminate a session
   * Releases resources, calculates final cost, and creates billing charge
   * Idempotent: returns current state if already terminated
   */
  @Post('sessions/:id/terminate')
  @HttpCode(HttpStatus.OK)
  async terminateSession(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.terminateSession(userId, id);
  }

  /**
   * Restart a running session
   * Calls orchestration service to restart the container
   */
  @Post('sessions/:id/restart')
  @HttpCode(HttpStatus.OK)
  async restartSession(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
    @Body() _dto: RestartSessionDto,
  ) {
    const userId = req.user.id;
    return this.computeService.restartSession(userId, id);
  }

  /**
   * Get container logs for a session
   * Returns the last 100 lines of container logs
   */
  @Get('sessions/:id/logs')
  async getSessionLogs(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionLogs(userId, id);
  }

  /**
   * Get connection info for a session
   * Returns session URL, username, and decrypted password if session is ready
   */
  @Get('sessions/:id/connection')
  async getSessionConnection(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionConnection(userId, id);
  }

  /**
   * Get all events for a session
   * Returns chronological list of session lifecycle events
   */
  @Get('sessions/:id/events')
  async getSessionEvents(
    @Req() req: { user: { id: string } },
    @Param('id') id: string,
  ) {
    const userId = req.user.id;
    return this.computeService.getSessionEvents(userId, id);
  }

  // ============================================================================
  // ADMIN/MONITORING ENDPOINTS
  // ============================================================================

  /**
   * Get resource status for all nodes
   * Shows total, allocated, and available resources per node
   */
  @Get('resources')
  async getNodeResourceStatus() {
    return this.computeService.getNodeResourceStatus();
  }

  /**
   * Get all sessions across all users (admin only)
   * Includes user info for each session
   */
  @Get('admin/sessions')
  async getAllSessions() {
    return this.computeService.getAllSessions();
  }
}
