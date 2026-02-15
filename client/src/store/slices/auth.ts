import { normalize } from 'normalizr';
import { authResponseSchema } from '../schemas.js';
import { mergeEntities } from './entities.js';
import type { AppThunk } from '../index.js';

export interface AuthState {
  currentUserId: number | null;
  currentPersonId: number | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  attemptedPath: string | null;
}

const initialState: AuthState = {
  currentUserId: null,
  currentPersonId: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  attemptedPath: null
};

// Action types
const AUTH_REQUEST = 'auth/request';
const AUTH_SUCCESS = 'auth/success';
const AUTH_FAILURE = 'auth/failure';
const AUTH_LOGOUT = 'auth/logout';
const AUTH_SET_ATTEMPTED_PATH = 'auth/setAttemptedPath';

// Action creators
const authRequest = () => ({ type: AUTH_REQUEST });
const authSuccess = (userId: number, personId: number | null) => ({
  type: AUTH_SUCCESS,
  payload: { userId, personId }
});
const authFailure = (error: string) => ({
  type: AUTH_FAILURE,
  payload: error
});
const authLogout = () => ({ type: AUTH_LOGOUT });

export const setAttemptedPath = (path: string | null) => ({
  type: AUTH_SET_ATTEMPTED_PATH,
  payload: path
});

// Thunks
export const sendMagicLink = (email: string): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      await apiClient.sendMagicLink(email);
      dispatch({ type: 'auth/magicLinkSent' });
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Failed to send sign-in link'));
      throw error;
    }
  };
};

export const verifyMagicLink = (token: string): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      const response = await apiClient.verifyMagicLink(token);
      if (!response.data) throw new Error('No data returned from verification');

      const normalized = normalize(response.data, authResponseSchema);
      dispatch(mergeEntities(normalized.entities));

      if (response.data.person) {
        dispatch(authSuccess(response.data.user.id, response.data.person.id));
      } else {
        dispatch(authSuccess(response.data.user.id, null));
      }

      await dispatch(loadUserPersons());
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Verification failed'));
      throw error;
    }
  };
};

export const register = (email: string): AppThunk<Promise<{ message: string }>> => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      const response = await apiClient.createUser({ email });
      // First user is auto-logged in; check if session was established
      if (response.message === 'Account created successfully') {
        // First user - check session to get auth state
        try {
          const sessionResponse = await apiClient.getCurrentSession();
          if (sessionResponse.data) {
            const normalized = normalize(sessionResponse.data, authResponseSchema);
            dispatch(mergeEntities(normalized.entities));
            if (sessionResponse.data.person) {
              dispatch(authSuccess(sessionResponse.data.user.id, sessionResponse.data.person.id));
            } else {
              dispatch(authSuccess(sessionResponse.data.user.id, null));
            }
            await dispatch(loadUserPersons());
          }
        } catch {
          // Session check failed - that's ok, user can login via magic link
          dispatch({ type: 'auth/registerSuccess' });
        }
      } else {
        dispatch({ type: 'auth/registerSuccess' });
      }
      return { message: response.message || 'User created successfully' };
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Registration failed'));
      throw error;
    }
  };
};

export const checkSession = (): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      const response = await apiClient.getCurrentSession();
      if (!response.data) throw new Error('No data returned from session check');

      const normalized = normalize(response.data, authResponseSchema);

      dispatch(mergeEntities(normalized.entities));

      if (response.data.person) {
        dispatch(authSuccess(response.data.user.id, response.data.person.id));
      } else {
        dispatch(authSuccess(response.data.user.id, null));
      }

      // Load all user persons for the person switcher
      await dispatch(loadUserPersons());
    } catch (error) {
      // Session check failure is expected when not logged in
      dispatch({ type: 'auth/sessionCheckComplete' });
    }
  };
};

export const logout = (): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    try {
      await apiClient.logout();
    } catch (error) {
      // Logout errors are not critical
      console.error('Logout error:', error);
    } finally {
      dispatch(authLogout());
    }
  };
};

export const resendVerification = (email: string): AppThunk => {
  return async (_dispatch, _getState, { apiClient }) => {
    try {
      await apiClient.resendVerification(email);
    } catch (error) {
      throw error;
    }
  };
};

export const verifyEmail = (token: string): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    dispatch(authRequest());
    try {
      await apiClient.verifyUser(token);
      dispatch({ type: 'auth/verifySuccess' });
    } catch (error) {
      dispatch(authFailure(error instanceof Error ? error.message : 'Verification failed'));
      throw error;
    }
  };
};

export const switchPerson = (personId: number): AppThunk => {
  return async (_dispatch, _getState, { apiClient }) => {
    try {
      await apiClient.setCurrentPerson(personId);
      // Reload the page to ensure clean state with new person context
      window.location.reload();
    } catch (error) {
      throw error;
    }
  };
};

export const loadUserPersons = (): AppThunk => {
  return async (dispatch, _getState, { apiClient }) => {
    try {
      const response = await apiClient.getUserPersons();
      if (!response.data) return;

      // Normalize and merge persons into entities
      const entities = {
        persons: response.data.reduce((acc: any, person: any) => {
          acc[person.id] = person;
          return acc;
        }, {})
      };

      dispatch(mergeEntities(entities));
    } catch (error) {
      // Silently fail if user is not authenticated
      console.error('Failed to load user persons:', error);
    }
  };
};

// Reducer
export const authReducer = (
  state = initialState,
  action: { type: string; payload?: any }
): AuthState => {
  switch (action.type) {
    case AUTH_REQUEST:
      return { ...state, isLoading: true, error: null };
    case AUTH_SUCCESS:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: true,
        currentUserId: action.payload.userId,
        currentPersonId: action.payload.personId,
        error: null
      };
    case AUTH_FAILURE:
      return {
        ...state,
        isLoading: false,
        isAuthenticated: false,
        error: action.payload
      };
    case AUTH_LOGOUT:
      return {
        ...initialState
      };
    case 'auth/sessionCheckComplete':
      return { ...state, isLoading: false };
    case 'auth/registerSuccess':
      return { ...state, isLoading: false, error: null };
    case 'auth/verifySuccess':
      return { ...state, isLoading: false, error: null };
    case 'auth/magicLinkSent':
      return { ...state, isLoading: false, error: null };
    case AUTH_SET_ATTEMPTED_PATH:
      return { ...state, attemptedPath: action.payload };
    default:
      return state;
  }
};
